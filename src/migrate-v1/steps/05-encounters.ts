import { randomUUID } from "crypto";

import { db } from "../../db";
import { encounters, visits } from "../../db/schema";
import {
  resolveUserFk,
  type MigrationContext,
  type MigrationStep,
} from "../context";
import { mapService, mapVisitStatus } from "../enums";
import { v1Batches, v1Query } from "../v1-client";

/**
 * v1 `Encounter` (a single clinical session) is split into the v2 model's two
 * tables: one `visits` row AND one `encounters` row (1:1). Both v2 ids are
 * recorded in the id-map under "visit" and "encounter" keyed by the *same* v1
 * encounter id, so the clinical children in step 06 (which only carry an
 * `encounter_id`) can be given BOTH `visitId` and `encounterId`.
 *
 * Notes:
 *  - v1 `reason` is occasionally empty but v2 requires it NOT NULL -> placeholder.
 *  - `followUpId` is a self-reference; processing in id order means the target
 *    is usually already migrated. Forward refs (rare) are left null.
 *  - v1 has no createdBy/updatedBy on encounters (only deletedBy).
 */
const REASON_PLACEHOLDER = "Not recorded";

interface V1Encounter {
  id: number;
  date: Date;
  reason: string | null;
  patientId: number;
  service: string | null;
  status: string | null;
  facilityId: number | null;
  followUpId: number | null;
  doctorId: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
  deletedBy: number | null;
}

function toDateString(d: Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

export const encountersStep: MigrationStep = {
  key: "encounters",
  title: "Encounters -> visits + encounters",
  async run(ctx: MigrationContext): Promise<void> {
    const { idMap, report } = ctx;
    let total = 0;

    // v1 `Encounter.facilityId` is effectively always NULL — v1 derived the
    // facility from the patient (`Encounter.patientId -> Patient.facilityId`).
    // Without a facility, the v2 app's facility scope hides every visit/
    // encounter (and their vitals/diagnoses/meds), so fall back to the
    // patient's facility. Preloaded as a Map to avoid a per-row v1 query.
    const patientFacility = new Map<number, number | null>();
    for (const r of await v1Query<{ id: number; facilityId: number | null }>(
      `SELECT id, "facilityId" FROM "Patient"`,
    )) {
      patientFacility.set(
        Number(r.id),
        r.facilityId == null ? null : Number(r.facilityId),
      );
    }

    for await (const batch of v1Batches<V1Encounter>(
      `"Encounter"`,
      "id",
      ctx.batchSize,
      `id, date, reason, "patientId", service, status, "facilityId",
       "followUpId", "doctorId", "createdAt", "updatedAt", "deletedAt", "deletedBy"`,
    )) {
      total += batch.length;
      for (const e of batch) {
        if (idMap.has("encounter", e.id)) {
          report.skipped("encounter");
          report.skipped("visit");
          continue;
        }

        const patientId = idMap.get("patient", e.patientId);
        if (!patientId) {
          report.warn(`encounter ${e.id}: patient ${e.patientId} not mapped`);
          report.failed("encounter");
          report.failed("visit");
          continue;
        }

        // Prefer the encounter's own facility; fall back to the patient's
        // (v1 leaves Encounter.facilityId null — see note above).
        const v1FacilityId = e.facilityId ?? patientFacility.get(e.patientId) ?? null;
        const facilityId =
          v1FacilityId == null ? null : idMap.get("facility", v1FacilityId) ?? null;
        const doctorId = idMap.get("user", e.doctorId) ?? null;
        const deletedBy =
          e.deletedBy == null
            ? null
            : resolveUserFk(ctx, "encounter", e.id, "deletedBy", e.deletedBy);
        const reason = e.reason?.trim() || REASON_PLACEHOLDER;
        const service = e.service?.trim() ? mapService(e.service) : null;
        const status = mapVisitStatus(e.status, report);
        const followUpVisitId = idMap.get("visit", e.followUpId) ?? null;
        const followUpEncounterId = idMap.get("encounter", e.followUpId) ?? null;

        if (ctx.dryRun) {
          // Register synthetic ids so step 06's dry-run can resolve the
          // visit/encounter FKs that clinical children carry.
          await idMap.set("visit", e.id, randomUUID());
          await idMap.set("encounter", e.id, randomUUID());
          report.inserted("visit");
          report.inserted("encounter");
          continue;
        }

        const ids = await db.transaction(async (tx) => {
          const [visit] = await tx
            .insert(visits)
            .values({
              date: toDateString(e.date),
              reason,
              service,
              status,
              patientId,
              facilityId,
              followUpId: followUpVisitId,
              doctorId,
              createdAt: e.createdAt ?? new Date(),
              updatedAt: e.updatedAt ?? null,
              deletedAt: e.deletedAt ?? null,
              deletedBy,
            })
            .returning({ id: visits.id });

          const [encounter] = await tx
            .insert(encounters)
            .values({
              encounterAt: e.date ?? new Date(),
              reason,
              service,
              status,
              encounterType: service ?? "opd",
              patientId,
              visitId: visit.id,
              facilityId,
              followUpId: followUpEncounterId,
              doctorId,
              createdAt: e.createdAt ?? new Date(),
              updatedAt: e.updatedAt ?? null,
              deletedAt: e.deletedAt ?? null,
              deletedBy,
            })
            .returning({ id: encounters.id });

          return { visitId: visit.id, encounterId: encounter.id };
        });

        await idMap.set("visit", e.id, ids.visitId);
        await idMap.set("encounter", e.id, ids.encounterId);
        report.inserted("visit");
        report.inserted("encounter");
      }
    }
    report.setV1Count("encounter", total);
    report.setV1Count("visit", total);
  },
};
