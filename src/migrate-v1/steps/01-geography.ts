import { db } from "../../db";
import { districts, municipalities, provinces } from "../../db/schema";
import type { MigrationContext, MigrationStep } from "../context";
import { v1Query } from "../v1-client";

/**
 * Geography is *matched*, not inserted: v2 is already seeded with the official
 * Nepal province/district/municipality tables (`seedGeography()`), so this
 * step only populates the id-map so later steps can rewire v1 integer geo FKs
 * to v2 uuids.
 *
 * Matching strategy (discovered empirically against the restored v1 snapshot):
 *  - PROVINCE: v1 has no `code` column, so match by normalized name
 *    ("Koshi" -> "Koshi Province"). 7 rows.
 *  - DISTRICT: v1 and v2 share the official district `code` (101, 102, ...).
 *    Match by code exactly. 77 rows.
 *  - MUNICIPALITY: codes DON'T align (v1 `code` is a global running sequence;
 *    v2 `code` is district-encoded), so match within the resolved district by
 *    normalized name (strips rural/urban/metropolitan/"municipality" noise and
 *    punctuation -> ~690/753), then fall back to ordinal position within the
 *    district (both sides ordered by their own code). Anything still unmatched
 *    is recorded for human review. 753 rows.
 */

interface V1Province { id: number; name: string }
interface V1District { id: number; code: number; name: string }
interface V1Municipality { id: number; code: number; district_id: number; name: string }

/** Normalize a place name for fuzzy matching across the two data sets. */
function normName(raw: unknown): string {
  return String(raw ?? "")
    .toLowerCase()
    .replace(
      /\b(rural|urban|sub-?metropolitan|metropolitan|metropolitian|municipality|city|nagarpalika|gaunpalika)\b/g,
      "",
    )
    .replace(/[^a-z0-9]/g, "");
}

function normProvince(raw: unknown): string {
  return String(raw ?? "")
    .toLowerCase()
    .replace(/\bprovince\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export const geographyStep: MigrationStep = {
  key: "geography",
  title: "Geography (match provinces/districts/municipalities)",
  async run(ctx: MigrationContext): Promise<void> {
    const { idMap, report } = ctx;

    // ---------- PROVINCES ----------
    const v1Provinces = await v1Query<V1Province>(
      `SELECT id, name FROM province ORDER BY id`,
    );
    report.setV1Count("province", v1Provinces.length);

    const v2Provinces = await db
      .select({ id: provinces.id, code: provinces.code, name: provinces.name })
      .from(provinces);
    const provByNorm = new Map<string, string>();
    for (const p of v2Provinces) {
      const en = (p.name as { en?: string })?.en ?? "";
      provByNorm.set(normProvince(en), p.id);
    }

    for (const p of v1Provinces) {
      if (idMap.has("province", p.id)) {
        report.skipped("province");
        continue;
      }
      const v2Id = provByNorm.get(normProvince(p.name));
      if (!v2Id) {
        report.recordUnmatchedGeo("province", p.id, p.name);
        report.failed("province");
        continue;
      }
      await idMap.set("province", p.id, v2Id);
      report.inserted("province");
    }

    // ---------- DISTRICTS (match by official code) ----------
    const v1Districts = await v1Query<V1District>(
      `SELECT id, code, name FROM district ORDER BY code`,
    );
    report.setV1Count("district", v1Districts.length);

    const v2Districts = await db
      .select({ id: districts.id, code: districts.code })
      .from(districts);
    const distByCode = new Map<number, string>();
    for (const d of v2Districts) distByCode.set(Number(d.code), d.id);

    for (const d of v1Districts) {
      if (idMap.has("district", d.id)) {
        report.skipped("district");
        continue;
      }
      const v2Id = distByCode.get(Number(d.code));
      if (!v2Id) {
        report.recordUnmatchedGeo("district", d.code, d.name);
        report.failed("district");
        continue;
      }
      await idMap.set("district", d.id, v2Id);
      report.inserted("district");
    }

    // ---------- MUNICIPALITIES (match within district) ----------
    const v1Munis = await v1Query<V1Municipality>(
      `SELECT id, code, district_id, name FROM municipality ORDER BY district_id, code`,
    );
    report.setV1Count("municipality", v1Munis.length);

    const v2Munis = await db
      .select({
        id: municipalities.id,
        code: municipalities.code,
        districtId: municipalities.districtId,
        name: municipalities.name,
      })
      .from(municipalities);

    // Per v2-district: normalized-name -> uuid, and code-ordered list (for the
    // ordinal-position fallback).
    const v2ByDistrict = new Map<
      string,
      { byName: Map<string, string>; ordered: Array<{ code: number; id: string }> }
    >();
    for (const m of v2Munis) {
      let bucket = v2ByDistrict.get(m.districtId);
      if (!bucket) {
        bucket = { byName: new Map(), ordered: [] };
        v2ByDistrict.set(m.districtId, bucket);
      }
      const en = (m.name as { en?: string })?.en ?? "";
      bucket.byName.set(normName(en), m.id);
      bucket.ordered.push({ code: Number(m.code), id: m.id });
    }
    for (const b of v2ByDistrict.values())
      b.ordered.sort((a, c) => a.code - c.code);

    // Group v1 munis by district, ordered by v1 code, to compute ordinal pos.
    const v1ByDistrict = new Map<number, V1Municipality[]>();
    for (const m of v1Munis) {
      const arr = v1ByDistrict.get(m.district_id) ?? [];
      arr.push(m);
      v1ByDistrict.set(m.district_id, arr);
    }
    for (const arr of v1ByDistrict.values())
      arr.sort((a, b) => Number(a.code) - Number(b.code));

    // Track which v2 ids are already consumed per district so the positional
    // fallback never assigns the same v2 municipality to two v1 rows.
    let positionalFallbacks = 0;
    for (const [v1DistrictId, arr] of v1ByDistrict) {
      const v2DistrictId = idMap.get("district", v1DistrictId);
      const bucket = v2DistrictId ? v2ByDistrict.get(v2DistrictId) : undefined;
      const usedV2 = new Set<string>();
      const newPairs: Array<{ v1Id: number; v2Id: string }> = [];

      arr.forEach((m, idx) => {
        if (idMap.has("municipality", m.id)) {
          report.skipped("municipality");
          // still mark its mapped target as used to keep the fallback honest
          const mapped = idMap.get("municipality", m.id);
          if (mapped) usedV2.add(mapped);
          return;
        }
        if (!bucket) {
          report.recordUnmatchedGeo("municipality", m.code, m.name);
          report.failed("municipality");
          return;
        }
        // 1) normalized-name match within district
        let v2Id = bucket.byName.get(normName(m.name));
        if (v2Id && usedV2.has(v2Id)) v2Id = undefined;
        // 2) ordinal-position fallback (same official sequence per district)
        if (!v2Id) {
          const candidate = bucket.ordered[idx];
          if (candidate && !usedV2.has(candidate.id)) {
            v2Id = candidate.id;
            positionalFallbacks++;
          }
        }
        if (!v2Id) {
          report.recordUnmatchedGeo("municipality", m.code, m.name);
          report.failed("municipality");
          return;
        }
        usedV2.add(v2Id);
        newPairs.push({ v1Id: m.id, v2Id });
        report.inserted("municipality");
      });

      await idMap.setMany("municipality", newPairs);
    }

    if (positionalFallbacks > 0)
      report.warn(
        `municipality: ${positionalFallbacks} matched by ordinal position ` +
          `(name drift) — spot-check addresses if precision matters`,
      );
  },
};
