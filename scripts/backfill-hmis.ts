/**
 * One-shot backfill script for Nepal HMIS 2082 maternal-health extensions.
 *
 * Idempotent — safe to re-run.
 *
 * What it does, per pregnancy:
 *   1. Parses `pregnancies.gravida varchar` to populate `gravida_num`.
 *   2. For each ANC visit with a known `pregnancies.last_menstruation_period`:
 *      computes `gestational_age_weeks` and the canonical
 *      `protocol_visit_number` from HMIS 2082 visit windows.
 *   3. Parses well-known phrases ("PPH", "eclampsia", "APH", "obstructed",
 *      "prolonged") from `obstructive_complications` / `danger_sign` /
 *      `complications` text columns into `pregnancy_complications` rows
 *      with their ICD-11 codes.
 *   4. Sets `pregnancies.hmis_compliant` based on the schema-completeness
 *      rule (LMP present AND >=1 structured ANC AND (still active OR
 *      delivery has delivery_mode/labor_type/place_code/maternal_outcome)).
 *
 * Run:
 *   NODE_ENV=development tsx scripts/backfill-hmis.ts
 */

import "dotenv/config";
import { db } from "../src/db";
import { sql } from "drizzle-orm";

// HMIS 2082 windows; mirror of MaternalHealthService.ANC_PROTOCOL_WINDOWS.
const ANC_WINDOWS: Array<{
  code: "ANC1" | "ANC2" | "ANC3" | "ANC4" | "ANC5" | "ANC6" | "ANC7" | "ANC8";
  min: number;
  max: number;
}> = [
  { code: "ANC1", min: 0, max: 12 },
  { code: "ANC2", min: 13, max: 16 },
  { code: "ANC3", min: 20, max: 24 },
  { code: "ANC4", min: 28, max: 28 },
  { code: "ANC5", min: 32, max: 32 },
  { code: "ANC6", min: 34, max: 34 },
  { code: "ANC7", min: 36, max: 36 },
  { code: "ANC8", min: 38, max: 40 },
];

function deriveAnc(weeks: number) {
  for (const w of ANC_WINDOWS) {
    if (weeks >= w.min && weeks <= w.max) return w.code;
  }
  if (weeks < 0) return "ANC1";
  if (weeks <= 19) return "ANC2";
  if (weeks <= 27) return "ANC3";
  if (weeks <= 31) return "ANC4";
  if (weeks <= 33) return "ANC5";
  if (weeks <= 35) return "ANC6";
  if (weeks <= 37) return "ANC7";
  return "ANC8";
}

// ICD-11 maternal complication code map (case-insensitive phrase → code+title).
const COMPLICATION_PATTERNS: Array<{
  regex: RegExp;
  code: string;
  title: string;
}> = [
  { regex: /\bpph\b|post[- ]?partum\s+haem?orrh?age/i, code: "JA43", title: "Postpartum haemorrhage" },
  { regex: /\baph\b|antepartum\s+haem?orrh?age/i, code: "JA41", title: "Antepartum haemorrhage" },
  { regex: /retained\s+placenta/i, code: "JA43.0", title: "Retained placenta" },
  { regex: /eclampsia/i, code: "JA25", title: "Eclampsia" },
  { regex: /(severe\s*)?pre[- ]?eclampsia/i, code: "JA24", title: "Severe/Pre-eclampsia" },
  { regex: /gestational\s+hypertension/i, code: "JA23", title: "Gestational hypertension" },
  { regex: /hyperemesis\s+gravidarum/i, code: "JA60.0", title: "Hyperemesis gravidarum" },
  { regex: /obstructed\s+labou?r/i, code: "JB06", title: "Obstructed labour" },
  { regex: /prolonged\s+labou?r/i, code: "JB03", title: "Prolonged labour" },
  { regex: /ruptured\s+uterus|uterine\s+rupture/i, code: "JB0A.1", title: "Ruptured uterus" },
  { regex: /puerperal\s+sepsis/i, code: "JB40.0", title: "Puerperal sepsis" },
  { regex: /ectopic\s+pregnancy/i, code: "JA01", title: "Ectopic pregnancy" },
  { regex: /abortion\s+complication/i, code: "JA05", title: "Abortion complication" },
];

type PregnancyRow = {
  id: string;
  facility_id: string;
  gravida: string;
  gravida_num: number | null;
  last_menstruation_period: string | null;
  status: string;
  hmis_compliant: boolean;
  [k: string]: unknown;
};

type AncRow = {
  id: string;
  pregnancy_id: string;
  patient_id: string;
  anc_visit_date: string | null;
  protocol_visit_number: string | null;
  gestational_age_weeks: number | null;
  obstructive_complications: string | null;
  danger_sign: string | null;
  [k: string]: unknown;
};

type DeliveryRow = {
  id: string;
  pregnancy_id: string;
  patient_id: string;
  delivery_mode: string | null;
  labor_type: string | null;
  place_code: string | null;
  maternal_outcome: string | null;
  other_problems: string | null;
  [k: string]: unknown;
};

async function main() {
  console.log("[hmis-backfill] starting…");

  // Step 1: parse gravida varchar → gravida_num where null.
  const pregsRes = await db.execute<PregnancyRow>(sql`
    SELECT id, facility_id, gravida, gravida_num, last_menstruation_period,
           status::text AS status, hmis_compliant
    FROM pregnancies
    WHERE deleted_at IS NULL
  `);
  const pregs = pregsRes.rows;
  console.log(`[hmis-backfill] inspecting ${pregs.length} pregnancies`);

  for (const p of pregs) {
    if (p.gravida_num == null && p.gravida) {
      const match = String(p.gravida).match(/(\d+)/);
      if (match) {
        const n = Number(match[1]);
        if (!Number.isNaN(n) && n >= 0 && n < 50) {
          await db.execute(sql`
            UPDATE pregnancies SET gravida_num = ${n}, updated_at = now()
            WHERE id = ${p.id}::uuid
          `);
        }
      }
    }
  }

  // Step 2: derive ANC protocol_visit_number where missing.
  const ancRes = await db.execute<AncRow>(sql`
    SELECT ac.id, ac.pregnancy_id, ac.patient_id, ac.anc_visit_date,
           ac.protocol_visit_number::text AS protocol_visit_number,
           ac.gestational_age_weeks, ac.obstructive_complications, ac.danger_sign
    FROM antenatal_cares ac
    WHERE ac.deleted_at IS NULL
  `);
  console.log(`[hmis-backfill] inspecting ${ancRes.rows.length} ANC rows`);

  const pregById = new Map<string, PregnancyRow>(pregs.map((p) => [p.id, p]));

  for (const anc of ancRes.rows) {
    const preg = pregById.get(anc.pregnancy_id);
    if (!preg || !preg.last_menstruation_period || !anc.anc_visit_date) continue;
    if (anc.protocol_visit_number) continue; // already set

    const ms =
      new Date(anc.anc_visit_date).getTime() -
      new Date(preg.last_menstruation_period).getTime();
    const weeks = Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
    if (weeks < 0 || weeks > 50) continue;
    const code = deriveAnc(weeks);

    await db.execute(sql`
      UPDATE antenatal_cares
      SET protocol_visit_number = ${code}::anc_protocol_visit_enum,
          gestational_age_weeks = ${weeks},
          updated_at = now()
      WHERE id = ${anc.id}::uuid
    `);
  }

  // Step 3: extract complications from text columns into pregnancy_complications.
  for (const anc of ancRes.rows) {
    const blob = [anc.obstructive_complications, anc.danger_sign]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (!blob) continue;

    for (const pat of COMPLICATION_PATTERNS) {
      if (!pat.regex.test(blob)) continue;
      // Idempotency: skip if already recorded for this ANC + ICD.
      const existing = await db.execute(sql`
        SELECT 1 FROM pregnancy_complications
        WHERE recorded_at_anc_id = ${anc.id}::uuid
          AND icd11_code = ${pat.code}
          AND deleted_at IS NULL
        LIMIT 1
      `);
      if (existing.rows.length > 0) continue;

      const preg = pregById.get(anc.pregnancy_id);
      if (!preg) continue;

      await db.execute(sql`
        INSERT INTO pregnancy_complications (
          pregnancy_id, stage, icd11_code, icd11_title,
          notes, recorded_at, recorded_at_anc_id, facility_id, created_at
        ) VALUES (
          ${anc.pregnancy_id}::uuid, 'anc'::complication_stage_enum,
          ${pat.code}, ${pat.title},
          ${"backfilled from free text: " + blob.slice(0, 200)},
          now(), ${anc.id}::uuid, ${preg.facility_id}::uuid, now()
        )
      `);
    }
  }

  // Same for deliveries (other_problems).
  const delRes = await db.execute<DeliveryRow>(sql`
    SELECT d.id, d.pregnancy_id, d.patient_id,
           d.delivery_mode::text AS delivery_mode,
           d.labor_type::text AS labor_type,
           d.place_code::text AS place_code,
           d.maternal_outcome::text AS maternal_outcome,
           d.other_problems
    FROM deliveries d
    WHERE d.deleted_at IS NULL
  `);
  console.log(`[hmis-backfill] inspecting ${delRes.rows.length} deliveries`);

  for (const d of delRes.rows) {
    if (!d.other_problems) continue;
    for (const pat of COMPLICATION_PATTERNS) {
      if (!pat.regex.test(d.other_problems)) continue;
      const existing = await db.execute(sql`
        SELECT 1 FROM pregnancy_complications
        WHERE recorded_at_delivery_id = ${d.id}::uuid
          AND icd11_code = ${pat.code}
          AND deleted_at IS NULL
        LIMIT 1
      `);
      if (existing.rows.length > 0) continue;

      const preg = pregById.get(d.pregnancy_id);
      if (!preg) continue;

      await db.execute(sql`
        INSERT INTO pregnancy_complications (
          pregnancy_id, stage, icd11_code, icd11_title,
          notes, recorded_at, recorded_at_delivery_id, facility_id, created_at
        ) VALUES (
          ${d.pregnancy_id}::uuid, 'delivery'::complication_stage_enum,
          ${pat.code}, ${pat.title},
          ${"backfilled from free text: " + d.other_problems.slice(0, 200)},
          now(), ${d.id}::uuid, ${preg.facility_id}::uuid, now()
        )
      `);
    }
  }

  // Step 4: refresh hmis_compliant flag for every pregnancy.
  for (const p of pregs) {
    const hasLmp = !!p.last_menstruation_period;
    const ancCountRes = await db.execute<{ c: number }>(sql`
      SELECT COUNT(*)::int AS c
      FROM antenatal_cares
      WHERE pregnancy_id = ${p.id}::uuid
        AND protocol_visit_number IS NOT NULL
        AND deleted_at IS NULL
    `);
    const hasAnc = Number(ancCountRes.rows[0]?.c ?? 0) > 0;

    const dRes = await db.execute<{
      delivery_mode: string | null;
      labor_type: string | null;
      place_code: string | null;
      maternal_outcome: string | null;
    }>(sql`
      SELECT delivery_mode::text AS delivery_mode,
             labor_type::text AS labor_type,
             place_code::text AS place_code,
             maternal_outcome::text AS maternal_outcome
      FROM deliveries
      WHERE pregnancy_id = ${p.id}::uuid
        AND deleted_at IS NULL
      LIMIT 1
    `);
    const delivery = dRes.rows[0];
    const stillActive = p.status === "active";
    const deliveryComplete =
      !!delivery &&
      !!delivery.delivery_mode &&
      !!delivery.labor_type &&
      !!delivery.place_code &&
      !!delivery.maternal_outcome;

    const compliant = hasLmp && hasAnc && (stillActive || deliveryComplete);
    if (compliant !== p.hmis_compliant) {
      await db.execute(sql`
        UPDATE pregnancies
        SET hmis_compliant = ${compliant}, updated_at = now()
        WHERE id = ${p.id}::uuid
      `);
    }
  }

  console.log("[hmis-backfill] done");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[hmis-backfill] failed:", err);
    process.exit(1);
  });
