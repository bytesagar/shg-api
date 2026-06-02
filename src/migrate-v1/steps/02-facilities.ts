import { randomUUID } from "crypto";

import { db } from "../../db";
import { health_facilities } from "../../db/schema";
import type { MigrationContext, MigrationStep } from "../context";
import { v1Query } from "../v1-client";

/**
 * Health facilities: insert one v2 `health_facilities` row per v1
 * `HealthFacility`, resolving the geo FKs through the id-map built in step 01.
 * Keyed in the id-map by v1 facility id so every later step (users, patients,
 * encounters, ...) can rewire its `facilityId`. `hfCode` is preserved verbatim
 * for future external matching.
 *
 * v1 facilities carry no createdBy/updatedBy (only deletedAt/deletedBy), and in
 * the snapshot none are soft-deleted, so there is no audit FK to rewire here.
 *
 * On a dry-run we don't write, but we still register a random uuid in the
 * id-map so downstream dry-run steps can resolve `facilityId`.
 */
interface V1Facility {
  id: number;
  name: string;
  address: string | null;
  phone: string;
  email: string;
  ward: string;
  palika: string;
  district: string;
  province: string;
  inchargeName: string;
  authority: string | null;
  authorityLevel: string | null;
  facilityType: string | null;
  hfCode: string | null;
  ownership: string | null;
  districtId: number | null;
  municipalityId: number | null;
  provinceId: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
  deletedBy: number | null;
}

export const facilitiesStep: MigrationStep = {
  key: "facilities",
  title: "Health facilities",
  async run(ctx: MigrationContext): Promise<void> {
    const { idMap, report } = ctx;

    const rows = await v1Query<V1Facility>(
      `SELECT id, name, address, phone, email, ward, palika, district, province,
              "inchargeName", authority, "authorityLevel", "facilityType",
              "hfCode", ownership, "districtId", "municipalityId", "provinceId",
              "createdAt", "updatedAt", "deletedAt", "deletedBy"
       FROM "HealthFacility" ORDER BY id`,
    );
    report.setV1Count("facility", rows.length);

    for (const f of rows) {
      if (idMap.has("facility", f.id)) {
        report.skipped("facility");
        continue;
      }

      const provinceId = idMap.get("province", f.provinceId) ?? null;
      const districtId = idMap.get("district", f.districtId) ?? null;
      const municipalityId = idMap.get("municipality", f.municipalityId) ?? null;
      // deletedBy points at a v1 user that isn't migrated yet (users come
      // later) — and is null across the snapshot anyway; leave it null.

      const values = {
        name: f.name,
        address: f.address ?? null,
        phone: f.phone,
        email: f.email,
        ward: f.ward,
        palika: f.palika,
        district: f.district,
        province: f.province,
        provinceId,
        districtId,
        municipalityId,
        inchargeName: f.inchargeName,
        hfCode: f.hfCode ?? null,
        authorityLevel: f.authorityLevel ?? null,
        authority: f.authority ?? null,
        ownership: f.ownership ?? null,
        facilityType: f.facilityType ?? null,
        createdAt: f.createdAt ?? new Date(),
        updatedAt: f.updatedAt ?? null,
        deletedAt: f.deletedAt ?? null,
      };

      let v2Id: string;
      if (ctx.dryRun) {
        v2Id = randomUUID();
      } else {
        const [inserted] = await db
          .insert(health_facilities)
          .values(values)
          .returning({ id: health_facilities.id });
        v2Id = inserted.id;
      }

      await idMap.set("facility", f.id, v2Id);
      report.inserted("facility");
    }
  },
};
