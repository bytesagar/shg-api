import { randomUUID } from "crypto";

import { db } from "../../db";
import {
  encounters,
  family_planning_news,
  family_planning_olds,
  family_planning_removals,
  family_plannings,
  fp_hormonal_details,
  fp_iucd_details,
  visits,
} from "../../db/schema";
import {
  resolveUserFk,
  type MigrationContext,
  type MigrationStep,
} from "../context";
import {
  mapFpDevice,
  mapFpServiceType,
  mapFpUsageTimePeriod,
} from "../enums";
import { v1Batches } from "../v1-client";

/**
 * Family planning. v1 keeps six tables:
 *   family_planning (the service card) ── family_planning_new (1:1)
 *                                       └─ family_planning_removal (1:1)
 *   family_planning_old (the "previous device" record, referenced 1:1 by a
 *                        new/removal row via previous_device_id)
 *   fp_hormonal_details / fp_iucd_details (1:1 off family_planning_new)
 *
 * v2 mirrors the shape, but `family_plannings` is welded into the clinical
 * model: it requires NOT NULL visit_id + encounter_id. v1 has neither (FP rows
 * are standalone with just patient + facility + service_date), so — exactly as
 * the v2 create-service does — we synthesize one visits + one encounters row
 * per FP card and point the FP row at them.
 *
 * Dependency order (parents first so FKs resolve):
 *   family_planning_old -> family_planning (+ synth visit/encounter)
 *     -> family_planning_new -> family_planning_removal
 *     -> fp_hormonal_details / fp_iucd_details
 */
const REASON = "Family planning service";

function trunc(s: string | null | undefined, n: number): string | null {
  if (s == null) return null;
  const t = String(s).trim();
  if (!t) return null;
  return t.length > n ? t.slice(0, n) : t;
}

/** timestamp -> "YYYY-MM-DD" (v2 FP date columns are date mode:"string"). */
function toDateStr(d: Date | null | undefined): string | null {
  if (d == null) return null;
  return new Date(d).toISOString().slice(0, 10);
}

interface V1FamilyPlanning {
  id: number;
  serviceDate: Date;
  patientId: number;
  facilityId: number;
  serviceType: string;
  serviceProviderId: number | null;
  serviceProviderFirstName: string | null;
  serviceProviderLastName: string | null;
  createdBy: number;
  updatedBy: number | null;
  deletedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
}

interface V1FpOld {
  id: number;
  previousDevice: string | null;
  continueSameDevice: boolean | null;
  discontinueReason: string | null;
  discontinueReasonOther: string | null;
  createdBy: number;
  updatedBy: number | null;
  deletedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
}

interface V1FpNew {
  id: number;
  familyPlanningId: number;
  lastMenstrualPeriod: Date | null;
  previousDeviceId: number | null;
  devicePlanned: string;
  deviceUsed: string;
  isActive: boolean;
  deviceNotUsedReason: string | null;
  usageTimePeriod: string | null;
  usageDate: Date | null;
  followUpDate: Date | null;
  createdBy: number;
  updatedBy: number | null;
  deletedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
}

interface V1FpRemoval {
  id: number;
  familyPlanningId: number;
  previousDeviceId: number | null;
  lastMenstrualPeriod: Date | null;
  removalDate: Date;
  placeOfFpDeviceUsed: string | null;
  otherHealthFacilityName: string | null;
  removalReason: string | null;
  createdBy: number | null;
  updatedBy: number | null;
  deletedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
}

interface V1FpHormonal {
  id: number;
  newFpId: number;
  swellingLegOrBreathShortness: boolean;
  painSwellingLegPregnancy: boolean;
  regularMenstrualBleeding: boolean;
  menstruationBleedingAmount: boolean;
  bleedingBetweenPeriods: boolean;
  jaundice: boolean;
  diabetes: boolean;
  severeHeadache: boolean;
  lumpOrSwellingBreast: boolean;
  createdBy: number | null;
  updatedBy: number | null;
  deletedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
}

interface V1FpIucd {
  id: number;
  newFpId: number;
  lowerAbdominalPain: boolean;
  foulSmellingVaginalDischarge: boolean;
  treatedForReproductiveTractInfection: boolean;
  createdBy: number | null;
  updatedBy: number | null;
  deletedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
}

export const familyPlanningStep: MigrationStep = {
  key: "family_planning",
  title: "Family planning (cards + new/old/removal/hormonal/iucd)",
  async run(ctx: MigrationContext): Promise<void> {
    const { idMap, report } = ctx;

    // ---------------- FAMILY PLANNING OLD (previous-device records) ----------------
    let total = 0;
    for await (const batch of v1Batches<V1FpOld>(
      `family_planning_old`,
      "id",
      ctx.batchSize,
      `id, previous_device AS "previousDevice",
       continue_same_device AS "continueSameDevice",
       discontinue_reason AS "discontinueReason",
       discontinue_reason_other AS "discontinueReasonOther",
       created_by AS "createdBy", updated_by AS "updatedBy",
       deleted_by AS "deletedBy", created_at AS "createdAt",
       updated_at AS "updatedAt", deleted_at AS "deletedAt"`,
    )) {
      total += batch.length;
      for (const o of batch) {
        if (idMap.has("fp_old", o.id)) {
          report.skipped("fp_old");
          continue;
        }
        const createdBy = resolveUserFk(ctx, "fp_old", o.id, "createdBy", o.createdBy);
        const updatedBy =
          o.updatedBy == null
            ? null
            : resolveUserFk(ctx, "fp_old", o.id, "updatedBy", o.updatedBy);
        const deletedBy =
          o.deletedBy == null
            ? null
            : resolveUserFk(ctx, "fp_old", o.id, "deletedBy", o.deletedBy);

        if (ctx.dryRun) {
          mapFpDevice(o.previousDevice, report);
          await idMap.set("fp_old", o.id, randomUUID());
          report.inserted("fp_old");
          continue;
        }

        const [row] = await db
          .insert(family_planning_olds)
          .values({
            previousDevice: mapFpDevice(o.previousDevice, report),
            continueSameDevice: o.continueSameDevice ?? null,
            discontinueReason: o.discontinueReason?.trim() || null,
            discontinueReasonOther: o.discontinueReasonOther?.trim() || null,
            createdBy,
            updatedBy,
            createdAt: o.createdAt ?? new Date(),
            updatedAt: o.updatedAt ?? null,
            deletedBy,
            deletedAt: o.deletedAt ?? null,
          })
          .returning({ id: family_planning_olds.id });
        await idMap.set("fp_old", o.id, row.id);
        report.inserted("fp_old");
      }
    }
    report.setV1Count("fp_old", total);

    // ---------------- FAMILY PLANNING (card + synthesized visit/encounter) ----------------
    total = 0;
    for await (const batch of v1Batches<V1FamilyPlanning>(
      `family_planning`,
      "id",
      ctx.batchSize,
      `id, service_date AS "serviceDate", patient_id AS "patientId",
       facility_id AS "facilityId", service_type AS "serviceType",
       service_provider_id AS "serviceProviderId",
       service_provider_first_name AS "serviceProviderFirstName",
       service_provider_last_name AS "serviceProviderLastName",
       created_by AS "createdBy", updated_by AS "updatedBy",
       deleted_by AS "deletedBy", created_at AS "createdAt",
       updated_at AS "updatedAt", deleted_at AS "deletedAt"`,
    )) {
      total += batch.length;
      for (const f of batch) {
        if (idMap.has("family_planning", f.id)) {
          report.skipped("family_planning");
          continue;
        }
        const patientId = idMap.get("patient", f.patientId);
        const facilityId = idMap.get("facility", f.facilityId) ?? null;
        if (!patientId || !facilityId) {
          report.warn(
            `family_planning ${f.id}: patient ${f.patientId}/facility ${f.facilityId} not mapped`,
          );
          report.failed("family_planning");
          continue;
        }
        const serviceProviderId = idMap.get("user", f.serviceProviderId) ?? null;
        const createdBy = resolveUserFk(ctx, "family_planning", f.id, "createdBy", f.createdBy);
        const updatedBy =
          f.updatedBy == null
            ? null
            : resolveUserFk(ctx, "family_planning", f.id, "updatedBy", f.updatedBy);
        const deletedBy =
          f.deletedBy == null
            ? null
            : resolveUserFk(ctx, "family_planning", f.id, "deletedBy", f.deletedBy);
        const serviceDate = toDateStr(f.serviceDate) ?? new Date().toISOString().slice(0, 10);

        if (ctx.dryRun) {
          mapFpServiceType(f.serviceType, report);
          await idMap.set("family_planning", f.id, randomUUID());
          report.inserted("family_planning");
          continue;
        }

        const v2Id = await db.transaction(async (tx) => {
          const [visit] = await tx
            .insert(visits)
            .values({
              date: serviceDate,
              reason: REASON,
              service: "family_planning",
              status: "finished",
              patientId,
              facilityId,
              doctorId: serviceProviderId,
              createdAt: f.createdAt ?? new Date(),
              updatedAt: f.updatedAt ?? null,
              deletedBy,
              deletedAt: f.deletedAt ?? null,
            })
            .returning({ id: visits.id });

          const [encounter] = await tx
            .insert(encounters)
            .values({
              encounterAt: f.serviceDate ?? new Date(),
              reason: REASON,
              service: "family_planning",
              status: "finished",
              encounterType: "family_planning",
              patientId,
              visitId: visit.id,
              facilityId,
              doctorId: serviceProviderId,
              createdBy,
              updatedBy,
              createdAt: f.createdAt ?? new Date(),
              updatedAt: f.updatedAt ?? null,
              deletedBy,
              deletedAt: f.deletedAt ?? null,
            })
            .returning({ id: encounters.id });

          const [fp] = await tx
            .insert(family_plannings)
            .values({
              serviceDate,
              visitId: visit.id,
              encounterId: encounter.id,
              patientId,
              facilityId,
              serviceType: mapFpServiceType(f.serviceType, report),
              serviceProviderId,
              serviceProviderFirstName: trunc(f.serviceProviderFirstName, 255),
              serviceProviderLastName: trunc(f.serviceProviderLastName, 255),
              createdBy,
              createdAt: f.createdAt ?? new Date(),
              updatedBy,
              updatedAt: f.updatedAt ?? null,
              deletedBy,
              deletedAt: f.deletedAt ?? null,
            })
            .returning({ id: family_plannings.id });

          return fp.id;
        });
        await idMap.set("family_planning", f.id, v2Id);
        report.inserted("family_planning");
      }
    }
    report.setV1Count("family_planning", total);

    // ---------------- FAMILY PLANNING NEW ----------------
    total = 0;
    for await (const batch of v1Batches<V1FpNew>(
      `family_planning_new`,
      "id",
      ctx.batchSize,
      `id, family_planning_id AS "familyPlanningId",
       last_menstrual_period AS "lastMenstrualPeriod",
       previous_device_id AS "previousDeviceId",
       device_planned AS "devicePlanned", device_used AS "deviceUsed",
       is_active AS "isActive", device_not_used_reason AS "deviceNotUsedReason",
       usage_time_period AS "usageTimePeriod", usage_date AS "usageDate",
       follow_up_date AS "followUpDate", created_by AS "createdBy",
       updated_by AS "updatedBy", deleted_by AS "deletedBy",
       created_at AS "createdAt", updated_at AS "updatedAt",
       deleted_at AS "deletedAt"`,
    )) {
      total += batch.length;
      for (const n of batch) {
        if (idMap.has("fp_new", n.id)) {
          report.skipped("fp_new");
          continue;
        }
        const familyPlanningId = idMap.get("family_planning", n.familyPlanningId);
        if (!familyPlanningId) {
          report.warn(
            `fp_new ${n.id}: family_planning ${n.familyPlanningId} not mapped`,
          );
          report.failed("fp_new");
          continue;
        }
        const previousDeviceId =
          n.previousDeviceId == null
            ? null
            : idMap.get("fp_old", n.previousDeviceId) ?? null;
        const createdBy = resolveUserFk(ctx, "fp_new", n.id, "createdBy", n.createdBy);
        const updatedBy =
          n.updatedBy == null
            ? null
            : resolveUserFk(ctx, "fp_new", n.id, "updatedBy", n.updatedBy);
        const deletedBy =
          n.deletedBy == null
            ? null
            : resolveUserFk(ctx, "fp_new", n.id, "deletedBy", n.deletedBy);

        if (ctx.dryRun) {
          mapFpDevice(n.devicePlanned, report);
          mapFpDevice(n.deviceUsed, report);
          mapFpUsageTimePeriod(n.usageTimePeriod, report);
          await idMap.set("fp_new", n.id, randomUUID());
          report.inserted("fp_new");
          continue;
        }

        const [row] = await db
          .insert(family_planning_news)
          .values({
            familyPlanningId,
            lastMenstrualPeriod: toDateStr(n.lastMenstrualPeriod),
            previousDeviceId,
            devicePlanned: mapFpDevice(n.devicePlanned, report) ?? "none",
            deviceUsed: mapFpDevice(n.deviceUsed, report) ?? "none",
            isActive: n.isActive ?? true,
            deviceNotUsedReason: n.deviceNotUsedReason?.trim() || null,
            usageTimePeriod: mapFpUsageTimePeriod(n.usageTimePeriod, report),
            usageDate: toDateStr(n.usageDate),
            followUpDate: toDateStr(n.followUpDate),
            createdBy,
            createdAt: n.createdAt ?? new Date(),
            updatedBy,
            updatedAt: n.updatedAt ?? null,
            deletedBy,
            deletedAt: n.deletedAt ?? null,
          })
          .returning({ id: family_planning_news.id });
        await idMap.set("fp_new", n.id, row.id);
        report.inserted("fp_new");
      }
    }
    report.setV1Count("fp_new", total);

    // ---------------- FAMILY PLANNING REMOVAL ----------------
    total = 0;
    for await (const batch of v1Batches<V1FpRemoval>(
      `family_planning_removal`,
      "id",
      ctx.batchSize,
      `id, family_planning_id AS "familyPlanningId",
       previous_device_id AS "previousDeviceId",
       last_menstrual_period AS "lastMenstrualPeriod",
       removal_date AS "removalDate",
       place_of_fp_device_used AS "placeOfFpDeviceUsed",
       other_health_facility_name AS "otherHealthFacilityName",
       removal_reason AS "removalReason", created_by AS "createdBy",
       updated_by AS "updatedBy", deleted_by AS "deletedBy",
       created_at AS "createdAt", updated_at AS "updatedAt",
       deleted_at AS "deletedAt"`,
    )) {
      total += batch.length;
      for (const r of batch) {
        if (idMap.has("fp_removal", r.id)) {
          report.skipped("fp_removal");
          continue;
        }
        const familyPlanningId = idMap.get("family_planning", r.familyPlanningId);
        if (!familyPlanningId) {
          report.warn(
            `fp_removal ${r.id}: family_planning ${r.familyPlanningId} not mapped`,
          );
          report.failed("fp_removal");
          continue;
        }
        const previousDeviceId =
          r.previousDeviceId == null
            ? null
            : idMap.get("fp_old", r.previousDeviceId) ?? null;
        const createdBy =
          r.createdBy == null
            ? null
            : resolveUserFk(ctx, "fp_removal", r.id, "createdBy", r.createdBy);
        const updatedBy =
          r.updatedBy == null
            ? null
            : resolveUserFk(ctx, "fp_removal", r.id, "updatedBy", r.updatedBy);
        const deletedBy =
          r.deletedBy == null
            ? null
            : resolveUserFk(ctx, "fp_removal", r.id, "deletedBy", r.deletedBy);

        if (ctx.dryRun) {
          await idMap.set("fp_removal", r.id, randomUUID());
          report.inserted("fp_removal");
          continue;
        }

        const [row] = await db
          .insert(family_planning_removals)
          .values({
            familyPlanningId,
            previousDeviceId,
            lastMenstrualPeriod: toDateStr(r.lastMenstrualPeriod),
            removalDate: toDateStr(r.removalDate),
            placeOfFpDeviceUsed: trunc(r.placeOfFpDeviceUsed, 255),
            otherHealthFacilityName: trunc(r.otherHealthFacilityName, 255),
            removalReason: r.removalReason?.trim() || null,
            createdBy,
            updatedBy,
            deletedBy,
            createdAt: r.createdAt ?? new Date(),
            updatedAt: r.updatedAt ?? null,
            deletedAt: r.deletedAt ?? null,
          })
          .returning({ id: family_planning_removals.id });
        await idMap.set("fp_removal", r.id, row.id);
        report.inserted("fp_removal");
      }
    }
    report.setV1Count("fp_removal", total);

    // ---------------- FP HORMONAL DETAILS ----------------
    total = 0;
    for await (const batch of v1Batches<V1FpHormonal>(
      `fp_hormonal_details`,
      "id",
      ctx.batchSize,
      `id, new_fp_id AS "newFpId",
       swelling_leg_or_breath_shortness AS "swellingLegOrBreathShortness",
       pain_swelling_leg_pregnancy AS "painSwellingLegPregnancy",
       regular_menstrual_bleeding AS "regularMenstrualBleeding",
       menstruation_bleeding_amount AS "menstruationBleedingAmount",
       bleeding_between_periods AS "bleedingBetweenPeriods",
       jaundice, diabetes, severe_headache AS "severeHeadache",
       lump_or_swelling_breast AS "lumpOrSwellingBreast",
       created_by AS "createdBy", updated_by AS "updatedBy",
       deleted_by AS "deletedBy", created_at AS "createdAt",
       updated_at AS "updatedAt", deleted_at AS "deletedAt"`,
    )) {
      total += batch.length;
      for (const h of batch) {
        if (idMap.has("fp_hormonal", h.id)) {
          report.skipped("fp_hormonal");
          continue;
        }
        const newFpId = idMap.get("fp_new", h.newFpId);
        if (!newFpId) {
          report.warn(`fp_hormonal ${h.id}: fp_new ${h.newFpId} not mapped`);
          report.failed("fp_hormonal");
          continue;
        }
        const createdBy =
          h.createdBy == null
            ? null
            : resolveUserFk(ctx, "fp_hormonal", h.id, "createdBy", h.createdBy);
        const updatedBy =
          h.updatedBy == null
            ? null
            : resolveUserFk(ctx, "fp_hormonal", h.id, "updatedBy", h.updatedBy);
        const deletedBy =
          h.deletedBy == null
            ? null
            : resolveUserFk(ctx, "fp_hormonal", h.id, "deletedBy", h.deletedBy);

        if (ctx.dryRun) {
          await idMap.set("fp_hormonal", h.id, randomUUID());
          report.inserted("fp_hormonal");
          continue;
        }

        const [row] = await db
          .insert(fp_hormonal_details)
          .values({
            newFpId,
            swellingLegOrBreathShortness: h.swellingLegOrBreathShortness ?? false,
            painSwellingLegPregnancy: h.painSwellingLegPregnancy ?? false,
            regularMenstrualBleeding: h.regularMenstrualBleeding ?? false,
            menstruationBleedingAmount: h.menstruationBleedingAmount ?? false,
            bleedingBetweenPeriods: h.bleedingBetweenPeriods ?? false,
            jaundice: h.jaundice ?? false,
            diabetes: h.diabetes ?? false,
            severeHeadache: h.severeHeadache ?? false,
            lumpOrSwellingBreast: h.lumpOrSwellingBreast ?? false,
            createdBy,
            updatedBy,
            deletedBy,
            createdAt: h.createdAt ?? new Date(),
            updatedAt: h.updatedAt ?? null,
            deletedAt: h.deletedAt ?? null,
          })
          .returning({ id: fp_hormonal_details.id });
        await idMap.set("fp_hormonal", h.id, row.id);
        report.inserted("fp_hormonal");
      }
    }
    report.setV1Count("fp_hormonal", total);

    // ---------------- FP IUCD DETAILS ----------------
    total = 0;
    for await (const batch of v1Batches<V1FpIucd>(
      `fp_iucd_details`,
      "id",
      ctx.batchSize,
      `id, new_fp_id AS "newFpId", lower_abdominal_pain AS "lowerAbdominalPain",
       foul_smelling_vaginal_discharge AS "foulSmellingVaginalDischarge",
       treated_for_reproductive_tract_infection AS "treatedForReproductiveTractInfection",
       created_by AS "createdBy", updated_by AS "updatedBy",
       deleted_by AS "deletedBy", created_at AS "createdAt",
       updated_at AS "updatedAt", deleted_at AS "deletedAt"`,
    )) {
      total += batch.length;
      for (const i of batch) {
        if (idMap.has("fp_iucd", i.id)) {
          report.skipped("fp_iucd");
          continue;
        }
        const newFpId = idMap.get("fp_new", i.newFpId);
        if (!newFpId) {
          report.warn(`fp_iucd ${i.id}: fp_new ${i.newFpId} not mapped`);
          report.failed("fp_iucd");
          continue;
        }
        const createdBy =
          i.createdBy == null
            ? null
            : resolveUserFk(ctx, "fp_iucd", i.id, "createdBy", i.createdBy);
        const updatedBy =
          i.updatedBy == null
            ? null
            : resolveUserFk(ctx, "fp_iucd", i.id, "updatedBy", i.updatedBy);
        const deletedBy =
          i.deletedBy == null
            ? null
            : resolveUserFk(ctx, "fp_iucd", i.id, "deletedBy", i.deletedBy);

        if (ctx.dryRun) {
          await idMap.set("fp_iucd", i.id, randomUUID());
          report.inserted("fp_iucd");
          continue;
        }

        const [row] = await db
          .insert(fp_iucd_details)
          .values({
            newFpId,
            lowerAbdominalPain: i.lowerAbdominalPain ?? false,
            foulSmellingVaginalDischarge: i.foulSmellingVaginalDischarge ?? false,
            treatedForReproductiveTractInfection:
              i.treatedForReproductiveTractInfection ?? false,
            createdBy,
            updatedBy,
            deletedBy,
            createdAt: i.createdAt ?? new Date(),
            updatedAt: i.updatedAt ?? null,
            deletedAt: i.deletedAt ?? null,
          })
          .returning({ id: fp_iucd_details.id });
        await idMap.set("fp_iucd", i.id, row.id);
        report.inserted("fp_iucd");
      }
    }
    report.setV1Count("fp_iucd", total);
  },
};
