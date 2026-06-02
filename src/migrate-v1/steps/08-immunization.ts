import { randomUUID } from "crypto";

import { db } from "../../db";
import {
  child_immunizations,
  growths,
  immunization_histories,
} from "../../db/schema";
import {
  resolveUserFk,
  type MigrationContext,
  type MigrationStep,
} from "../context";
import { v1Batches, v1Query } from "../v1-client";

/**
 * Child immunization. v1 `ChildImmunization` is the parent card; its histories
 * (per-vaccine doses) and growth-monitoring rows hang off it. v2 keeps the same
 * three tables with uuid FKs.
 *
 * Quirk: v2 `growths.facility_id` is NOT NULL but v1 `Growth` has no facility
 * column, so we source it via COALESCE(childImmunization.facilityId,
 * patient.facilityId) (verified non-null for all rows) using two small lookup
 * maps preloaded up front — joining inside `v1Batches` would break its keyset
 * pagination (the joined `id` column name collides). `immunization_histories.
 * facility_id` (nullable) is likewise back-filled from the parent card.
 *
 * v2's HMIS-2082 extension columns have no v1 source and stay null/default
 * (including the (patient, vaccine_code, dose_number) unique index — both are
 * null here, which Postgres treats as distinct, so no dose collisions).
 */

function trunc(s: string | null | undefined, n: number): string | null {
  if (s == null) return null;
  const t = String(s).trim();
  if (!t) return null;
  return t.length > n ? t.slice(0, n) : t;
}

interface V1ChildImmunization {
  id: number;
  mothersName: string | null;
  fathersName: string | null;
  weightAtBirth: number | null;
  patientId: number;
  facilityId: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
  deletedBy: number | null;
}

interface V1ImmunizationHistory {
  id: number;
  vaccineName: string;
  date: Date;
  vaccinated: number | null;
  vaccinatedDate: Date | null;
  aefi: string | null;
  patientId: number;
  childImmunizationId: number;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
  deletedBy: number | null;
}

interface V1Growth {
  id: number;
  date: Date;
  weight: number | null;
  height: number | null;
  muac: number | null;
  patientId: number;
  childImmunizationId: number | null;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
  deletedBy: number | null;
}

export const immunizationStep: MigrationStep = {
  key: "immunization",
  title: "Child immunization + histories + growth",
  async run(ctx: MigrationContext): Promise<void> {
    const { idMap, report } = ctx;

    // Preload v1 facility sources (avoids joins that break keyset pagination).
    const childImmFacility = new Map<number, number | null>();
    for (const r of await v1Query<{ id: number; facilityId: number | null }>(
      `SELECT id, "facilityId" FROM "ChildImmunization"`,
    )) {
      childImmFacility.set(Number(r.id), r.facilityId == null ? null : Number(r.facilityId));
    }
    const patientFacility = new Map<number, number | null>();
    for (const r of await v1Query<{ id: number; facilityId: number | null }>(
      `SELECT id, "facilityId" FROM "Patient"`,
    )) {
      patientFacility.set(Number(r.id), r.facilityId == null ? null : Number(r.facilityId));
    }

    // ---------------- CHILD IMMUNIZATIONS (parent) ----------------
    let total = 0;
    for await (const batch of v1Batches<V1ChildImmunization>(
      `"ChildImmunization"`,
      "id",
      ctx.batchSize,
      `id, "mothersName", "fathersName", "weightAtBirth", "patientId",
       "facilityId", "createdAt", "updatedAt", "deletedAt", "deletedBy"`,
    )) {
      total += batch.length;
      for (const c of batch) {
        if (idMap.has("child_immunization", c.id)) {
          report.skipped("child_immunization");
          continue;
        }
        const patientId = idMap.get("patient", c.patientId);
        if (!patientId) {
          report.warn(
            `child_immunization ${c.id}: patient ${c.patientId} not mapped`,
          );
          report.failed("child_immunization");
          continue;
        }
        const facilityId = idMap.get("facility", c.facilityId) ?? null;
        const deletedBy =
          c.deletedBy == null
            ? null
            : resolveUserFk(ctx, "child_immunization", c.id, "deletedBy", c.deletedBy);

        if (ctx.dryRun) {
          await idMap.set("child_immunization", c.id, randomUUID());
          report.inserted("child_immunization");
          continue;
        }

        const [row] = await db
          .insert(child_immunizations)
          .values({
            mothersName: trunc(c.mothersName, 255),
            fathersName: trunc(c.fathersName, 255),
            weightAtBirth: c.weightAtBirth ?? null,
            patientId,
            facilityId,
            createdAt: c.createdAt ?? new Date(),
            updatedAt: c.updatedAt ?? null,
            deletedAt: c.deletedAt ?? null,
            deletedBy,
          })
          .returning({ id: child_immunizations.id });
        await idMap.set("child_immunization", c.id, row.id);
        report.inserted("child_immunization");
      }
    }
    report.setV1Count("child_immunization", total);

    // ---------------- IMMUNIZATION HISTORIES ----------------
    total = 0;
    for await (const batch of v1Batches<V1ImmunizationHistory>(
      `"ImmunizationHistory"`,
      "id",
      ctx.batchSize,
      `id, "vaccineName", date, vaccinated, "vaccinatedDate", aefi,
       "patientId", "childImmunizationId", "createdBy", "updatedBy",
       "createdAt", "updatedAt", "deletedAt", "deletedBy"`,
    )) {
      total += batch.length;
      for (const h of batch) {
        if (idMap.has("immunization_history", h.id)) {
          report.skipped("immunization_history");
          continue;
        }
        const patientId = idMap.get("patient", h.patientId);
        const childImmunizationId = idMap.get(
          "child_immunization",
          h.childImmunizationId,
        );
        if (!patientId || !childImmunizationId) {
          report.warn(
            `immunization_history ${h.id}: patient ${h.patientId}/card ${h.childImmunizationId} not mapped`,
          );
          report.failed("immunization_history");
          continue;
        }
        const v1Facility = childImmFacility.get(h.childImmunizationId) ?? null;
        const facilityId = idMap.get("facility", v1Facility) ?? null;
        const createdBy =
          h.createdBy == null
            ? null
            : resolveUserFk(ctx, "immunization_history", h.id, "createdBy", h.createdBy);
        const updatedBy =
          h.updatedBy == null
            ? null
            : resolveUserFk(ctx, "immunization_history", h.id, "updatedBy", h.updatedBy);
        const deletedBy =
          h.deletedBy == null
            ? null
            : resolveUserFk(ctx, "immunization_history", h.id, "deletedBy", h.deletedBy);

        if (ctx.dryRun) {
          await idMap.set("immunization_history", h.id, randomUUID());
          report.inserted("immunization_history");
          continue;
        }

        const [row] = await db
          .insert(immunization_histories)
          .values({
            vaccineName: trunc(h.vaccineName, 255) ?? "Not recorded",
            date: h.date ?? new Date(),
            vaccinated: h.vaccinated ?? null,
            vaccinatedDate: h.vaccinatedDate ?? null,
            aefi: h.aefi?.trim() || null,
            patientId,
            childImmunizationId,
            facilityId,
            createdBy,
            updatedBy,
            createdAt: h.createdAt ?? new Date(),
            updatedAt: h.updatedAt ?? null,
            deletedAt: h.deletedAt ?? null,
            deletedBy,
          })
          .returning({ id: immunization_histories.id });
        await idMap.set("immunization_history", h.id, row.id);
        report.inserted("immunization_history");
      }
    }
    report.setV1Count("immunization_history", total);

    // ---------------- GROWTHS ----------------
    total = 0;
    for await (const batch of v1Batches<V1Growth>(
      `"Growth"`,
      "id",
      ctx.batchSize,
      `id, date, weight, height, muac, "patientId", "childImmunizationId",
       "createdBy", "updatedBy", "createdAt", "updatedAt", "deletedAt", "deletedBy"`,
    )) {
      total += batch.length;
      for (const g of batch) {
        if (idMap.has("growth", g.id)) {
          report.skipped("growth");
          continue;
        }
        const patientId = idMap.get("patient", g.patientId);
        let v1Facility: number | null = null;
        if (g.childImmunizationId != null) {
          v1Facility = childImmFacility.get(g.childImmunizationId) ?? null;
        }
        if (v1Facility == null) {
          v1Facility = patientFacility.get(g.patientId) ?? null;
        }
        const facilityId = idMap.get("facility", v1Facility) ?? null;
        if (!patientId || !facilityId) {
          report.warn(
            `growth ${g.id}: patient ${g.patientId}/facility ${v1Facility} not mapped`,
          );
          report.failed("growth");
          continue;
        }
        const childImmunizationId =
          g.childImmunizationId == null
            ? null
            : idMap.get("child_immunization", g.childImmunizationId) ?? null;
        const createdBy =
          g.createdBy == null
            ? null
            : resolveUserFk(ctx, "growth", g.id, "createdBy", g.createdBy);
        const updatedBy =
          g.updatedBy == null
            ? null
            : resolveUserFk(ctx, "growth", g.id, "updatedBy", g.updatedBy);
        const deletedBy =
          g.deletedBy == null
            ? null
            : resolveUserFk(ctx, "growth", g.id, "deletedBy", g.deletedBy);

        if (ctx.dryRun) {
          await idMap.set("growth", g.id, randomUUID());
          report.inserted("growth");
          continue;
        }

        const [row] = await db
          .insert(growths)
          .values({
            date: g.date ?? new Date(),
            weight: g.weight ?? null,
            height: g.height ?? null,
            muac: g.muac ?? null,
            patientId,
            facilityId,
            childImmunizationId,
            createdBy,
            updatedBy,
            createdAt: g.createdAt ?? new Date(),
            updatedAt: g.updatedAt ?? null,
            deletedAt: g.deletedAt ?? null,
            deletedBy,
          })
          .returning({ id: growths.id });
        await idMap.set("growth", g.id, row.id);
        report.inserted("growth");
      }
    }
    report.setV1Count("growth", total);
  },
};
