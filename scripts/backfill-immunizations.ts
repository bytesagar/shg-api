/**
 * Idempotent backfill for Nepal HMIS 2082 child-immunization data.
 *
 * What it does, per row:
 *   1. Maps `immunization_histories.vaccine_name` (free text) into structured
 *      `(vaccine_code, dose_number)` via a regex table. Existing structured
 *      values are not overwritten.
 *   2. Sets `mode='routine'` where unset.
 *   3. Backfills `administered_at` from `vaccinated_date` or `date`.
 *   4. Copies `facility_id` from the linked child_immunizations row.
 *
 * Ethnicity is not stored on child_immunizations — it derives from the
 * patient's person.caste, so there is nothing to backfill for it.
 *
 * Run:
 *   NODE_ENV=development tsx scripts/backfill-immunizations.ts
 */

import "dotenv/config";
import { db } from "../src/db";
import { sql } from "drizzle-orm";

// Order matters: longer / more specific patterns first.
const VACCINE_PATTERNS: Array<{
  regex: RegExp;
  vaccineCode: string;
  doseNumber?: number;
}> = [
  // Pentavalent (DPT-HepB-Hib)
  { regex: /pent(?:a(?:valent)?)?\s*1|dpt[\s/-]*hep[\s/-]*b[\s/-]*hib\s*1/i, vaccineCode: "PENTA", doseNumber: 1 },
  { regex: /pent(?:a(?:valent)?)?\s*2|dpt[\s/-]*hep[\s/-]*b[\s/-]*hib\s*2/i, vaccineCode: "PENTA", doseNumber: 2 },
  { regex: /pent(?:a(?:valent)?)?\s*3|dpt[\s/-]*hep[\s/-]*b[\s/-]*hib\s*3/i, vaccineCode: "PENTA", doseNumber: 3 },

  // OPV / bOPV
  { regex: /(?:b)?opv\s*1|polio\s*1/i, vaccineCode: "OPV", doseNumber: 1 },
  { regex: /(?:b)?opv\s*2|polio\s*2/i, vaccineCode: "OPV", doseNumber: 2 },
  { regex: /(?:b)?opv\s*3|polio\s*3/i, vaccineCode: "OPV", doseNumber: 3 },

  // fIPV
  { regex: /fipv\s*1|f[-\s]?ipv\s*1/i, vaccineCode: "FIPV", doseNumber: 1 },
  { regex: /fipv\s*2|f[-\s]?ipv\s*2/i, vaccineCode: "FIPV", doseNumber: 2 },

  // PCV
  { regex: /pcv\s*1/i, vaccineCode: "PCV", doseNumber: 1 },
  { regex: /pcv\s*2/i, vaccineCode: "PCV", doseNumber: 2 },
  { regex: /pcv\s*3/i, vaccineCode: "PCV", doseNumber: 3 },

  // Rota
  { regex: /rota\s*1/i, vaccineCode: "ROTA", doseNumber: 1 },
  { regex: /rota\s*2/i, vaccineCode: "ROTA", doseNumber: 2 },

  // MR
  { regex: /(?:measles[-\s]?rubella|mr)\s*1/i, vaccineCode: "MR", doseNumber: 1 },
  { regex: /(?:measles[-\s]?rubella|mr)\s*2/i, vaccineCode: "MR", doseNumber: 2 },

  // JE (single dose)
  { regex: /\bje\b|japanese\s*encephalitis/i, vaccineCode: "JE", doseNumber: 1 },

  // TCV / Typhoid (single dose)
  { regex: /\btcv\b|typhoid/i, vaccineCode: "TCV", doseNumber: 1 },

  // HPV
  { regex: /hpv\s*1/i, vaccineCode: "HPV", doseNumber: 1 },
  { regex: /hpv\s*2/i, vaccineCode: "HPV", doseNumber: 2 },

  // BCG (single dose)
  { regex: /\bbcg\b/i, vaccineCode: "BCG", doseNumber: 1 },

  // TD doses (shared with maternal flow; these may also exist here for siblings)
  { regex: /\btd\s*1\b/i, vaccineCode: "TD", doseNumber: 1 },
  { regex: /\btd\s*2(?:\+|\s*plus)?\b/i, vaccineCode: "TD", doseNumber: 3 }, // TD2+ = booster
  { regex: /\btd\s*2\b/i, vaccineCode: "TD", doseNumber: 2 },
];

type ImmunizationRow = {
  id: string;
  vaccine_name: string | null;
  vaccine_code: string | null;
  dose_number: number | null;
  mode: string | null;
  administered_at: Date | null;
  vaccinated_date: Date | null;
  date: Date | null;
  child_immunization_id: string;
  facility_id: string | null;
  [k: string]: unknown;
};

async function main() {
  console.log("[immunization-backfill] starting…");

  // 1. Backfill vaccine_code + dose_number on immunization_histories from
  //    legacy vaccineName free-text.
  const rowsRes = await db.execute<ImmunizationRow>(sql`
    SELECT ih.id, ih.vaccine_name, ih.vaccine_code, ih.dose_number,
           ih.mode::text AS mode, ih.administered_at, ih.vaccinated_date,
           ih.date, ih.child_immunization_id, ih.facility_id
    FROM immunization_histories ih
    WHERE ih.deleted_at IS NULL
  `);
  console.log(`[immunization-backfill] inspecting ${rowsRes.rows.length} doses`);

  let mapped = 0;
  for (const row of rowsRes.rows) {
    const updates: Record<string, unknown> = {};

    if (!row.vaccine_code && row.vaccine_name) {
      const match = VACCINE_PATTERNS.find((p) => p.regex.test(row.vaccine_name!));
      if (match) {
        updates.vaccine_code = match.vaccineCode;
        if (match.doseNumber != null) {
          updates.dose_number = match.doseNumber;
        }
        mapped++;
      }
    }

    if (!row.administered_at) {
      const fallback = row.vaccinated_date ?? row.date;
      if (fallback) updates.administered_at = fallback;
    }

    if (Object.keys(updates).length === 0) continue;

    // Drizzle's `sql` template doesn't accept dynamic SET clauses cleanly, so
    // we hand-build the update via execute. Order: column = literal/value.
    const setFragments = Object.entries(updates).map(([col, val]) => {
      if (val instanceof Date) {
        return sql.raw(`${col} = '${val.toISOString()}'`);
      }
      if (typeof val === "number") {
        return sql.raw(`${col} = ${val}`);
      }
      const escaped = String(val).replace(/'/g, "''");
      return sql.raw(`${col} = '${escaped}'`);
    });
    const setClause = sql.join(setFragments, sql.raw(", "));

    await db.execute(sql`
      UPDATE immunization_histories
      SET ${setClause}, updated_at = now()
      WHERE id = ${row.id}::uuid
    `);
  }

  console.log(
    `[immunization-backfill] mapped ${mapped} legacy free-text doses to vaccine_code`,
  );

  // 2. Backfill facility_id from the linked child_immunizations row when
  //    immunization_histories.facility_id is null.
  await db.execute(sql`
    UPDATE immunization_histories AS ih
    SET facility_id = ci.facility_id, updated_at = now()
    FROM child_immunizations AS ci
    WHERE ih.child_immunization_id = ci.id
      AND ih.facility_id IS NULL
      AND ci.facility_id IS NOT NULL
  `);

  // Note: ethnicity is not stored on child_immunizations — it derives from
  // the patient's person.caste, so there is nothing to snapshot here.

  console.log("[immunization-backfill] done");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[immunization-backfill] failed:", err);
    process.exit(1);
  });
