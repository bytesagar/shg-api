import { randomUUID } from "crypto";

import { db } from "../../db";
import {
  antenatal_cares,
  deliveries,
  delivery_children,
  home_baby_postnatal_cares,
  home_mother_postnatal_cares,
  postnatal_cares,
  pregnancies,
} from "../../db/schema";
import {
  resolveUserFk,
  type MigrationContext,
  type MigrationStep,
} from "../context";
import { v1Batches } from "../v1-client";

/**
 * Maternal health. v1 anchors everything on `Pregnancy`; v2 keeps the same
 * shape (pregnancies + antenatal_cares + deliveries + delivery_children +
 * postnatal_cares + home_mother/baby_postnatal_cares) with uuid FKs.
 *
 * Order matters: pregnancies first (parent of all), then deliveries (parent of
 * delivery_children), then the rest. Each child's `pregnancyId`/`deliveryId`
 * is rewired through the id-map; `patientId` through the patient map; audit
 * FKs (createdBy/updatedBy/deletedBy) through the user map with system-user
 * fallback; assignedFchvId/serviceProvidedBy mapped softly (null if unmapped).
 *
 * v1 misspellings handled here: lastMensuratonPeriod, ppHeamorage(+Treatment),
 * umblicalArea, umblicalCream, jundice, weignt_of_baby, assignedFCHVID.
 *
 * v2's HMIS-2082 extension columns have no v1 source and stay null/default.
 */

function trunc(s: string | null | undefined, n: number): string | null {
  if (s == null) return null;
  const t = String(s).trim();
  if (!t) return null;
  return t.length > n ? t.slice(0, n) : t;
}

/** A real Date (v1 timestamp) -> "YYYY-MM-DD". */
function toDateStr(d: Date | null | undefined): string | null {
  if (d == null) return null;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? null : t.toISOString().slice(0, 10);
}

/** v1 free-text date column (ISO-prefixed in the snapshot) -> "YYYY-MM-DD". */
function looseDate(s: string | null | undefined): string | null {
  const t = s?.trim() || "";
  return /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : null;
}

/** Resolve the three audit FKs (system-user fallback) for a row. */
function auditFks(
  ctx: MigrationContext,
  entity: string,
  rowId: number,
  row: { createdBy?: number | null; updatedBy?: number | null; deletedBy?: number | null },
) {
  return {
    createdBy:
      row.createdBy == null
        ? null
        : resolveUserFk(ctx, entity, rowId, "createdBy", row.createdBy),
    updatedBy:
      row.updatedBy == null
        ? null
        : resolveUserFk(ctx, entity, rowId, "updatedBy", row.updatedBy),
    deletedBy:
      row.deletedBy == null
        ? null
        : resolveUserFk(ctx, entity, rowId, "deletedBy", row.deletedBy),
  };
}

// ---------------------------------------------------------------------------
// Row shapes (audit cols aliased to camelCase in SQL)
// ---------------------------------------------------------------------------

interface V1Pregnancy {
  id: number;
  firstVisit: Date;
  gravida: string;
  para: string | null;
  lastMenstruationPeriod: string | null;
  expectedDeliveryDate: string | null;
  patientId: number;
  facilityId: number | null;
  assignedFchvId: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
  deletedBy: number | null;
}

interface V1Anc {
  id: number;
  ancVisitDate: Date | null;
  visitingTimeWeek: string | null;
  visitingTimeMonth: string | null;
  motherWeight: number | null;
  anemia: number | null;
  edema: number | null;
  systolic: number | null;
  diastolic: number | null;
  pregnancyPeriodWeek: string | null;
  fundalHeight: number | null;
  babyPresentation: string | null;
  heartRate: number | null;
  otherProblems: string | null;
  treatment: string | null;
  medicalAdvice: string | null;
  nextVisitSchedule: Date | null;
  ironTablet: number | null;
  albendazole: number | null;
  tdVaccination: string | null;
  obstructiveComplications: string | null;
  obstructiveComplicationsOther: string | null;
  dangerSign: string | null;
  dangerSignOther: string | null;
  document: string | null;
  doctorFeedback: string | null;
  calcium: number | null;
  folicAcid: number | null;
  refer: string | null;
  referReason: string | null;
  investigation: string | null;
  serviceProvidedBy: number | null;
  patientId: number;
  pregnancyId: number;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
  deletedBy: number | null;
}

interface V1Delivery {
  id: number;
  deliveryDate: Date | null;
  placeOfDelivery: string | null;
  otherPlaceOfDelivery: string | null;
  babyPresentation: string | null;
  typeOfDelivery: string | null;
  noOfLiveMaleBaby: number | null;
  noOfLiveFemaleBaby: number | null;
  noOfStillMaleBaby: number | null;
  noOfStillFemaleBaby: number | null;
  noOfFreshStillBirth: number | null;
  noOfMaceratedStillBirth: number | null;
  deliveryAttendedBy: string | null;
  otherProblems: string | null;
  treatment: string | null;
  investigation: string | null;
  doctorFeedback: string | null;
  refer: string | null;
  referReason: string | null;
  vitaminK: number | null;
  umbilicalCream: number | null;
  patientId: number;
  pregnancyId: number;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
  deletedBy: number | null;
}

interface V1DeliveryChild {
  id: number;
  deliveryId: number;
  weightOfBaby: number | null;
  newBornBabyStatus: string | null;
  patientId: number;
  pregnancyId: number;
  apgarScore1: number | null;
  apgarScore2: number | null;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
  deletedBy: number | null;
}

interface V1Pnc {
  id: number;
  visitingTime: string;
  visitTime: string;
  visitDate: Date;
  conditionOfMother: string;
  conditionOfBaby: string;
  treatment: string;
  medicalAdvice: string;
  familyPlanningServices: string;
  complications: string;
  dangerSignsOnMother: string;
  dangerSignsOnBaby: string;
  checkupAttendedBy: string;
  newBornBabyStatus: string;
  refer: string | null;
  referReason: string | null;
  doctorFeedback: string | null;
  calcium: number | null;
  ironTablet: number | null;
  investigation: string | null;
  otherProblems: string | null;
  serviceProvidedBy: number | null;
  patientId: number;
  pregnancyId: number;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
  deletedBy: number | null;
}

interface V1HomeMother {
  id: number;
  visitingTime: string;
  visitTime: string;
  visitDate: Date;
  pulse: number;
  bodyTemperature: number;
  bpSystolic: number;
  bpDiastolic: number;
  ppHaemorage: string;
  ppHaemorageTreatment: string;
  breastExamination: string;
  edema: string;
  examinationOfUterus: string;
  vaginalExamination: string;
  urinationDifficulties: string;
  vaginalDischarge: string | null;
  patientId: number;
  pregnancyId: number;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
  deletedBy: number | null;
}

interface V1HomeBaby {
  id: number;
  visitingTime: string;
  visitTime: string;
  visitDate: Date;
  activities: string;
  respiration: number;
  temperature: number;
  umbilicalArea: string;
  skin: string;
  eye: string;
  jaundice: string;
  breastFeeding: string;
  stool: string;
  urination: string;
  umbilicalCream: string | null;
  healthCareProvider: string;
  patientId: number;
  pregnancyId: number;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
  deletedBy: number | null;
}

// ---------------------------------------------------------------------------

export const maternalStep: MigrationStep = {
  key: "maternal",
  title: "Maternal health (pregnancy/ANC/delivery/PNC)",
  async run(ctx: MigrationContext): Promise<void> {
    const { idMap, report } = ctx;

    // ---------------- PREGNANCIES (parent) ----------------
    let total = 0;
    for await (const batch of v1Batches<V1Pregnancy>(
      `"Pregnancy"`,
      "id",
      ctx.batchSize,
      `id, "firstVisit", gravida, para,
       "lastMensuratonPeriod" AS "lastMenstruationPeriod",
       "expectedDeliveryDate", "patientId", "facilityId",
       "assignedFCHVID" AS "assignedFchvId",
       "createdAt", "updatedAt", "deletedAt", "deletedBy"`,
    )) {
      total += batch.length;
      for (const p of batch) {
        if (idMap.has("pregnancy", p.id)) {
          report.skipped("pregnancy");
          continue;
        }
        const patientId = idMap.get("patient", p.patientId);
        if (!patientId) {
          report.warn(`pregnancy ${p.id}: patient ${p.patientId} not mapped`);
          report.failed("pregnancy");
          continue;
        }
        const facilityId = idMap.get("facility", p.facilityId) ?? null;
        const assignedFchvId = idMap.get("user", p.assignedFchvId) ?? null;
        const { deletedBy } = auditFks(ctx, "pregnancy", p.id, p);

        if (ctx.dryRun) {
          await idMap.set("pregnancy", p.id, randomUUID());
          report.inserted("pregnancy");
          continue;
        }

        const [row] = await db
          .insert(pregnancies)
          .values({
            firstVisit: toDateStr(p.firstVisit)!,
            gravida: trunc(p.gravida, 50) ?? "0",
            para: trunc(p.para, 50),
            lastMenstruationPeriod: looseDate(p.lastMenstruationPeriod),
            expectedDeliveryDate: looseDate(p.expectedDeliveryDate),
            status: "active",
            patientId,
            facilityId,
            assignedFchvId,
            createdAt: p.createdAt ?? new Date(),
            updatedAt: p.updatedAt ?? null,
            deletedAt: p.deletedAt ?? null,
            deletedBy,
          })
          .returning({ id: pregnancies.id });
        await idMap.set("pregnancy", p.id, row.id);
        report.inserted("pregnancy");
      }
    }
    report.setV1Count("pregnancy", total);

    // ---------------- ANTENATAL CARES ----------------
    total = 0;
    for await (const batch of v1Batches<V1Anc>(
      `"AntenatalCare"`,
      "id",
      ctx.batchSize,
      `id, "ancVisitDate", "visitingTimeWeek", "visitingTimeMonth",
       "motherWeight", anemia, edema, systolic, diastolic,
       "pregnancyPeriodWeek", "fundalHeight", "babyPresentation", "heartRate",
       "otherProblems", treatment, "medicalAdvice", "nextVisitSchedule",
       "ironTablet", albendazole, "tdVaccination", "obstructiveComplications",
       obstructive_complications_other AS "obstructiveComplicationsOther",
       "dangerSign", danger_sign_other AS "dangerSignOther", document,
       "doctorFeedback", calcium, "folicAcid", refer, "referReason",
       investigation, "serviceProvidedBy", "patientId", "pregnancyId",
       "createdBy", "updatedBy", "createdAt", "updatedAt", "deletedAt", "deletedBy"`,
    )) {
      total += batch.length;
      for (const a of batch) {
        if (idMap.has("antenatal_care", a.id)) {
          report.skipped("antenatal_care");
          continue;
        }
        const patientId = idMap.get("patient", a.patientId);
        const pregnancyId = idMap.get("pregnancy", a.pregnancyId);
        if (!patientId || !pregnancyId) {
          report.warn(
            `antenatal_care ${a.id}: patient ${a.patientId}/pregnancy ${a.pregnancyId} not mapped`,
          );
          report.failed("antenatal_care");
          continue;
        }
        const serviceProvidedBy = idMap.get("user", a.serviceProvidedBy) ?? null;
        const audit = auditFks(ctx, "antenatal_care", a.id, a);

        if (ctx.dryRun) {
          await idMap.set("antenatal_care", a.id, randomUUID());
          report.inserted("antenatal_care");
          continue;
        }

        const [row] = await db
          .insert(antenatal_cares)
          .values({
            ancVisitDate: toDateStr(a.ancVisitDate),
            visitingTimeWeek: trunc(a.visitingTimeWeek, 50),
            visitingTimeMonth: trunc(a.visitingTimeMonth, 50),
            motherWeight: a.motherWeight ?? null,
            anemia: a.anemia ?? null,
            edema: a.edema ?? null,
            systolic: a.systolic ?? null,
            diastolic: a.diastolic ?? null,
            pregnancyPeriodWeek: trunc(a.pregnancyPeriodWeek, 50),
            fundalHeight: a.fundalHeight ?? null,
            babyPresentation: trunc(a.babyPresentation, 255),
            heartRate: a.heartRate ?? null,
            otherProblems: a.otherProblems?.trim() || null,
            treatment: a.treatment?.trim() || null,
            medicalAdvice: a.medicalAdvice?.trim() || null,
            nextVisitSchedule: toDateStr(a.nextVisitSchedule),
            ironTablet: a.ironTablet ?? null,
            albendazole: a.albendazole ?? null,
            tdVaccination: trunc(a.tdVaccination, 255),
            obstructiveComplications: a.obstructiveComplications?.trim() || null,
            obstructiveComplicationsOther:
              a.obstructiveComplicationsOther?.trim() || null,
            dangerSign: a.dangerSign?.trim() || null,
            dangerSignOther: a.dangerSignOther?.trim() || null,
            documentUrl: trunc(a.document, 500),
            doctorFeedback: a.doctorFeedback?.trim() || null,
            refer: trunc(a.refer, 255),
            referReason: a.referReason?.trim() || null,
            calcium: a.calcium ?? null,
            folicAcid: a.folicAcid ?? null,
            investigation: a.investigation?.trim() || null,
            serviceProvidedBy,
            patientId,
            pregnancyId,
            createdBy: audit.createdBy,
            updatedBy: audit.updatedBy,
            createdAt: a.createdAt ?? new Date(),
            updatedAt: a.updatedAt ?? null,
            deletedAt: a.deletedAt ?? null,
            deletedBy: audit.deletedBy,
          })
          .returning({ id: antenatal_cares.id });
        await idMap.set("antenatal_care", a.id, row.id);
        report.inserted("antenatal_care");
      }
    }
    report.setV1Count("antenatal_care", total);

    // ---------------- DELIVERIES (parent of delivery_children) ----------------
    total = 0;
    for await (const batch of v1Batches<V1Delivery>(
      `"Delivery"`,
      "id",
      ctx.batchSize,
      `id, "deliveryDate", "placeOfDelivery", "otherPlaceOfDelivery",
       "babyPresentation", "typeOfDelivery", "noOfLiveMaleBaby",
       "noOfLiveFemaleBaby", "noOfStillMaleBaby", "noOfStillFemaleBaby",
       "noOfFreshStillBirth", "noOfMaceratedStillBirth", "deliveryAttendedBy",
       "otherProblems", treatment, investigation, "doctorFeedback", refer,
       "referReason", "vitaminK", "umbilicalCream", "patientId", "pregnancyId",
       "createdBy", "updatedBy", "createdAt", "updatedAt", "deletedAt", "deletedBy"`,
    )) {
      total += batch.length;
      for (const d of batch) {
        if (idMap.has("delivery", d.id)) {
          report.skipped("delivery");
          continue;
        }
        const patientId = idMap.get("patient", d.patientId);
        const pregnancyId = idMap.get("pregnancy", d.pregnancyId);
        if (!patientId || !pregnancyId) {
          report.warn(
            `delivery ${d.id}: patient ${d.patientId}/pregnancy ${d.pregnancyId} not mapped`,
          );
          report.failed("delivery");
          continue;
        }
        const audit = auditFks(ctx, "delivery", d.id, d);

        if (ctx.dryRun) {
          await idMap.set("delivery", d.id, randomUUID());
          report.inserted("delivery");
          continue;
        }

        const [row] = await db
          .insert(deliveries)
          .values({
            deliveryDate: toDateStr(d.deliveryDate),
            placeOfDelivery: trunc(d.placeOfDelivery, 255),
            otherPlaceOfDelivery: trunc(d.otherPlaceOfDelivery, 255),
            babyPresentation: trunc(d.babyPresentation, 255),
            typeOfDelivery: trunc(d.typeOfDelivery, 255),
            noOfLiveMaleBaby: d.noOfLiveMaleBaby ?? null,
            noOfLiveFemaleBaby: d.noOfLiveFemaleBaby ?? null,
            noOfStillMaleBaby: d.noOfStillMaleBaby ?? null,
            noOfStillFemaleBaby: d.noOfStillFemaleBaby ?? null,
            noOfFreshStillBirth: d.noOfFreshStillBirth ?? null,
            noOfMaceratedStillBirth: d.noOfMaceratedStillBirth ?? null,
            deliveryAttendedBy: trunc(d.deliveryAttendedBy, 255),
            otherProblems: d.otherProblems?.trim() || null,
            treatment: d.treatment?.trim() || null,
            investigation: d.investigation?.trim() || null,
            doctorFeedback: d.doctorFeedback?.trim() || null,
            refer: trunc(d.refer, 255),
            referReason: d.referReason?.trim() || null,
            vitaminK: d.vitaminK ?? null,
            umbilicalCream: d.umbilicalCream ?? null,
            patientId,
            pregnancyId,
            createdBy: audit.createdBy,
            updatedBy: audit.updatedBy,
            createdAt: d.createdAt ?? new Date(),
            updatedAt: d.updatedAt ?? null,
            deletedAt: d.deletedAt ?? null,
            deletedBy: audit.deletedBy,
          })
          .returning({ id: deliveries.id });
        await idMap.set("delivery", d.id, row.id);
        report.inserted("delivery");
      }
    }
    report.setV1Count("delivery", total);

    // ---------------- DELIVERY CHILDREN ----------------
    total = 0;
    for await (const batch of v1Batches<V1DeliveryChild>(
      `delivery_children`,
      "id",
      ctx.batchSize,
      `id, delivery_id AS "deliveryId", weignt_of_baby AS "weightOfBaby",
       new_born_baby_status AS "newBornBabyStatus", patient_id AS "patientId",
       pregnancy_id AS "pregnancyId", apgar_score_1 AS "apgarScore1",
       apgar_score_2 AS "apgarScore2", created_by AS "createdBy",
       updated_by AS "updatedBy", created_at AS "createdAt",
       updated_at AS "updatedAt", deleted_at AS "deletedAt",
       deleted_by AS "deletedBy"`,
    )) {
      total += batch.length;
      for (const c of batch) {
        if (idMap.has("delivery_child", c.id)) {
          report.skipped("delivery_child");
          continue;
        }
        const deliveryId = idMap.get("delivery", c.deliveryId);
        const patientId = idMap.get("patient", c.patientId);
        const pregnancyId = idMap.get("pregnancy", c.pregnancyId);
        if (!deliveryId || !patientId || !pregnancyId) {
          report.warn(
            `delivery_child ${c.id}: delivery ${c.deliveryId}/patient ${c.patientId}/pregnancy ${c.pregnancyId} not mapped`,
          );
          report.failed("delivery_child");
          continue;
        }
        const audit = auditFks(ctx, "delivery_child", c.id, c);

        if (ctx.dryRun) {
          await idMap.set("delivery_child", c.id, randomUUID());
          report.inserted("delivery_child");
          continue;
        }

        const [row] = await db
          .insert(delivery_children)
          .values({
            deliveryId,
            weightOfBaby: c.weightOfBaby ?? null,
            newBornBabyStatus: trunc(c.newBornBabyStatus, 255),
            patientId,
            pregnancyId,
            apgarScore1: c.apgarScore1 ?? null,
            apgarScore2: c.apgarScore2 ?? null,
            createdBy: audit.createdBy,
            updatedBy: audit.updatedBy,
            createdAt: c.createdAt ?? new Date(),
            updatedAt: c.updatedAt ?? null,
            deletedAt: c.deletedAt ?? null,
            deletedBy: audit.deletedBy,
          })
          .returning({ id: delivery_children.id });
        await idMap.set("delivery_child", c.id, row.id);
        report.inserted("delivery_child");
      }
    }
    report.setV1Count("delivery_child", total);

    // ---------------- POSTNATAL CARES (facility) ----------------
    total = 0;
    for await (const batch of v1Batches<V1Pnc>(
      `"PostnatalCare"`,
      "id",
      ctx.batchSize,
      `id, "visitingTime", "visitTime", "visitDate", "conditionOfMother",
       "conditionOfBaby", treatment, "medicalAdvice", "familyPlanningServices",
       complications, "dangerSignsOnMother", "dangerSignsOnBaby",
       "checkupAttendedBy", "newBornBabyStatus", refer, "referReason",
       "doctorFeedback", calcium, "ironTablet", investigation, "otherProblems",
       "serviceProvidedBy", "patientId", "pregnancyId", "createdBy", "updatedBy",
       "createdAt", "updatedAt", "deletedAt", "deletedBy"`,
    )) {
      total += batch.length;
      for (const p of batch) {
        if (idMap.has("postnatal_care", p.id)) {
          report.skipped("postnatal_care");
          continue;
        }
        const patientId = idMap.get("patient", p.patientId);
        const pregnancyId = idMap.get("pregnancy", p.pregnancyId);
        if (!patientId || !pregnancyId) {
          report.warn(
            `postnatal_care ${p.id}: patient ${p.patientId}/pregnancy ${p.pregnancyId} not mapped`,
          );
          report.failed("postnatal_care");
          continue;
        }
        const serviceProvidedBy = idMap.get("user", p.serviceProvidedBy) ?? null;
        const audit = auditFks(ctx, "postnatal_care", p.id, p);

        if (ctx.dryRun) {
          await idMap.set("postnatal_care", p.id, randomUUID());
          report.inserted("postnatal_care");
          continue;
        }

        const [row] = await db
          .insert(postnatal_cares)
          .values({
            visitingTime: trunc(p.visitingTime, 100) ?? "",
            visitTime: trunc(p.visitTime, 100) ?? "",
            visitDate: toDateStr(p.visitDate)!,
            conditionOfMother: p.conditionOfMother ?? "",
            conditionOfBaby: p.conditionOfBaby ?? "",
            treatment: p.treatment ?? "",
            medicalAdvice: p.medicalAdvice ?? "",
            familyPlanningServices: p.familyPlanningServices ?? "",
            complications: p.complications ?? "",
            dangerSignsOnMother: p.dangerSignsOnMother ?? "",
            dangerSignsOnBaby: p.dangerSignsOnBaby ?? "",
            checkupAttendedBy: trunc(p.checkupAttendedBy, 255) ?? "",
            newBornBabyStatus: trunc(p.newBornBabyStatus, 255) ?? "",
            refer: trunc(p.refer, 255),
            referReason: p.referReason?.trim() || null,
            otherProblems: p.otherProblems?.trim() || null,
            investigation: p.investigation?.trim() || null,
            doctorFeedback: p.doctorFeedback?.trim() || null,
            ironTablet: p.ironTablet ?? null,
            calcium: p.calcium ?? null,
            patientId,
            pregnancyId,
            serviceProvidedBy,
            createdBy: audit.createdBy,
            updatedBy: audit.updatedBy,
            createdAt: p.createdAt ?? new Date(),
            updatedAt: p.updatedAt ?? null,
            deletedAt: p.deletedAt ?? null,
            deletedBy: audit.deletedBy,
          })
          .returning({ id: postnatal_cares.id });
        await idMap.set("postnatal_care", p.id, row.id);
        report.inserted("postnatal_care");
      }
    }
    report.setV1Count("postnatal_care", total);

    // ---------------- HOME MOTHER PNC ----------------
    total = 0;
    for await (const batch of v1Batches<V1HomeMother>(
      `"HomeMotherPostnatalCare"`,
      "id",
      ctx.batchSize,
      `id, "visitingTime", "visitTime", "visitDate", pulse,
       "bodyTemperature", "bpSystolic", "bpDiastolic",
       "ppHeamorage" AS "ppHaemorage",
       "ppHeamorageTreatment" AS "ppHaemorageTreatment",
       "breastExamination", edema, "examinationOfUterus", "vaginalExamination",
       "urinationDifficulties", "vaginalDischarge", "patientId", "pregnancyId",
       "createdBy", "updatedBy", "createdAt", "updatedAt", "deletedAt", "deletedBy"`,
    )) {
      total += batch.length;
      for (const m of batch) {
        if (idMap.has("home_mother_pnc", m.id)) {
          report.skipped("home_mother_pnc");
          continue;
        }
        const patientId = idMap.get("patient", m.patientId);
        const pregnancyId = idMap.get("pregnancy", m.pregnancyId);
        if (!patientId || !pregnancyId) {
          report.warn(
            `home_mother_pnc ${m.id}: patient ${m.patientId}/pregnancy ${m.pregnancyId} not mapped`,
          );
          report.failed("home_mother_pnc");
          continue;
        }
        const audit = auditFks(ctx, "home_mother_pnc", m.id, m);

        if (ctx.dryRun) {
          await idMap.set("home_mother_pnc", m.id, randomUUID());
          report.inserted("home_mother_pnc");
          continue;
        }

        const [row] = await db
          .insert(home_mother_postnatal_cares)
          .values({
            visitingTime: trunc(m.visitingTime, 100) ?? "",
            visitTime: trunc(m.visitTime, 100) ?? "",
            visitDate: m.visitDate ?? new Date(),
            pulse: m.pulse,
            bodyTemperature: m.bodyTemperature,
            bpSystolic: m.bpSystolic,
            bpDiastolic: m.bpDiastolic,
            ppHaemorage: m.ppHaemorage ?? "",
            ppHaemorageTreatment: m.ppHaemorageTreatment ?? "",
            breastExamination: m.breastExamination ?? "",
            edema: m.edema ?? "",
            examinationOfUterus: m.examinationOfUterus ?? "",
            vaginalExamination: m.vaginalExamination ?? "",
            urinationDifficulties: m.urinationDifficulties ?? "",
            vaginalDischarge: m.vaginalDischarge?.trim() || null,
            patientId,
            pregnancyId,
            createdBy: audit.createdBy,
            updatedBy: audit.updatedBy,
            createdAt: m.createdAt ?? new Date(),
            updatedAt: m.updatedAt ?? null,
            deletedAt: m.deletedAt ?? null,
            deletedBy: audit.deletedBy,
          })
          .returning({ id: home_mother_postnatal_cares.id });
        await idMap.set("home_mother_pnc", m.id, row.id);
        report.inserted("home_mother_pnc");
      }
    }
    report.setV1Count("home_mother_pnc", total);

    // ---------------- HOME BABY PNC ----------------
    total = 0;
    for await (const batch of v1Batches<V1HomeBaby>(
      `"HomeBabyPostnatalCare"`,
      "id",
      ctx.batchSize,
      `id, "visitingTime", "visitTime", "visitDate", activities, respiration,
       temperature, "umblicalArea" AS "umbilicalArea", skin, eye,
       jundice AS "jaundice", "breastFeeding", stool, urination,
       "umblicalCream" AS "umbilicalCream", "healthCareProvider",
       "patientId", "pregnancyId", "createdBy", "updatedBy", "createdAt",
       "updatedAt", "deletedAt", "deletedBy"`,
    )) {
      total += batch.length;
      for (const b of batch) {
        if (idMap.has("home_baby_pnc", b.id)) {
          report.skipped("home_baby_pnc");
          continue;
        }
        const patientId = idMap.get("patient", b.patientId);
        const pregnancyId = idMap.get("pregnancy", b.pregnancyId);
        if (!patientId || !pregnancyId) {
          report.warn(
            `home_baby_pnc ${b.id}: patient ${b.patientId}/pregnancy ${b.pregnancyId} not mapped`,
          );
          report.failed("home_baby_pnc");
          continue;
        }
        const audit = auditFks(ctx, "home_baby_pnc", b.id, b);

        if (ctx.dryRun) {
          await idMap.set("home_baby_pnc", b.id, randomUUID());
          report.inserted("home_baby_pnc");
          continue;
        }

        const [row] = await db
          .insert(home_baby_postnatal_cares)
          .values({
            visitingTime: trunc(b.visitingTime, 100) ?? "",
            visitTime: trunc(b.visitTime, 100) ?? "",
            visitDate: b.visitDate ?? new Date(),
            activities: b.activities ?? "",
            respiration: b.respiration,
            temperature: b.temperature,
            umbilicalArea: b.umbilicalArea ?? "",
            skin: b.skin ?? "",
            eye: b.eye ?? "",
            jaundice: b.jaundice ?? "",
            breastFeeding: b.breastFeeding ?? "",
            stool: b.stool ?? "",
            urination: b.urination ?? "",
            umbilicalCream: b.umbilicalCream?.trim() || null,
            healthCareProvider: trunc(b.healthCareProvider, 255) ?? "",
            patientId,
            pregnancyId,
            createdBy: audit.createdBy,
            updatedBy: audit.updatedBy,
            createdAt: b.createdAt ?? new Date(),
            updatedAt: b.updatedAt ?? null,
            deletedAt: b.deletedAt ?? null,
            deletedBy: audit.deletedBy,
          })
          .returning({ id: home_baby_postnatal_cares.id });
        await idMap.set("home_baby_pnc", b.id, row.id);
        report.inserted("home_baby_pnc");
      }
    }
    report.setV1Count("home_baby_pnc", total);
  },
};
