import { randomUUID } from "crypto";

import type { PgColumn, PgTable } from "drizzle-orm/pg-core";

import { db } from "../../db";
import {
  complaints,
  confirm_diagnoses,
  documents,
  histories,
  medications,
  provisional_diagnoses,
  tests,
  treatments,
  vitals,
} from "../../db/schema";
import {
  resolveUserFk,
  type MigrationContext,
  type MigrationStep,
} from "../context";
import { mapDurationUnit, mapSeverity, mapTestCategory } from "../enums";
import { v1Batches } from "../v1-client";

/**
 * Clinical children of an encounter. In v1 every one of these tables hangs off a
 * single `Encounter` via `encounter_id` (Document additionally allows null).
 * v2 split that encounter into a `visits` row AND an `encounters` row (step 05),
 * recording BOTH uuids in the id-map under "visit"/"encounter" keyed by the same
 * v1 encounter id — so here each child is rewired to carry both `visitId`
 * (NOT NULL on the v2 tables) and `encounterId` (nullable back-reference).
 *
 * v1 has no physical-examination table, so v2 `physical_examinations` stays empty.
 *
 * Tables handled: vital, complaint, history, test, ProvisionalDiagnosis,
 * ConfirmDiagnosis, Treatment, Medication, Document.
 */

const TEXT = ""; // v1 NOT NULL text columns are never null; placeholder for clarity

function trunc(s: string | null | undefined, n: number): string | null {
  if (s == null) return null;
  const t = String(s).trim();
  if (!t) return null;
  return t.length > n ? t.slice(0, n) : t;
}

/**
 * v1 `Treatment.followUpDate` is FREE TEXT: ~96% are real ISO dates, the rest
 * are notes like "7 days". Parse real dates into the v2 timestamp; fold any
 * unparseable text into `followUpText` so nothing is lost.
 */
function parseFollowUp(
  dateRaw: string | null,
  textRaw: string | null,
): { followUpDate: Date | null; followUpText: string | null } {
  let followUpText = textRaw?.trim() || null;
  let followUpDate: Date | null = null;
  const d = dateRaw?.trim() || "";
  if (d) {
    if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
      const parsed = new Date(d);
      if (!Number.isNaN(parsed.getTime())) followUpDate = parsed;
    }
    if (!followUpDate) {
      // unparseable -> keep as text so the clinician's note survives
      followUpText = [followUpText, d].filter(Boolean).join(" | ");
    }
  }
  return { followUpDate, followUpText };
}

/** Common shape after aliasing every v1 audit column to camelCase in SQL. */
interface BaseChildRow {
  id: number;
  encounterId: number | null;
  patientId?: number | null;
  createdBy: number | null;
  updatedBy: number | null;
  deletedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
}

interface Resolved {
  visitId: string | null;
  encounterId: string | null;
  patientId: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  deletedBy: string | null;
}

interface ChildConfig<R extends BaseChildRow> {
  /** id-map + report entity key */
  entity: string;
  /** v1 table identifier, already quoted for the raw query */
  v1Table: string;
  /** SELECT column list (alias audit/fk cols to the camelCase BaseChildRow shape) */
  selectCols: string;
  target: PgTable;
  /** the target's primary-key column, used for `.returning({ id })` */
  idColumn: PgColumn;
  /** v2 visit_id is NOT NULL on every table except documents */
  requireVisit: boolean;
  /** v2 patient_id is NOT NULL on complaint/dx/treatment/medication/document */
  requirePatient: boolean;
  /** build the row-specific insert values (common cols are merged in by runner) */
  toValues: (row: R, r: Resolved) => Record<string, unknown>;
}

async function runChild<R extends BaseChildRow>(
  ctx: MigrationContext,
  cfg: ChildConfig<R>,
): Promise<void> {
  const { idMap, report } = ctx;
  let total = 0;

  for await (const batch of v1Batches<R>(
    cfg.v1Table,
    "id",
    ctx.batchSize,
    cfg.selectCols,
  )) {
    total += batch.length;
    for (const row of batch) {
      if (idMap.has(cfg.entity, row.id)) {
        report.skipped(cfg.entity);
        continue;
      }

      const visitId =
        row.encounterId == null ? null : idMap.get("visit", row.encounterId) ?? null;
      const encounterId =
        row.encounterId == null
          ? null
          : idMap.get("encounter", row.encounterId) ?? null;
      const patientId =
        row.patientId == null ? null : idMap.get("patient", row.patientId) ?? null;

      if (cfg.requireVisit && !visitId) {
        report.warn(
          `${cfg.entity} ${row.id}: encounter ${row.encounterId} not mapped`,
        );
        report.failed(cfg.entity);
        continue;
      }
      if (cfg.requirePatient && !patientId) {
        report.warn(
          `${cfg.entity} ${row.id}: patient ${row.patientId} not mapped`,
        );
        report.failed(cfg.entity);
        continue;
      }

      const resolved: Resolved = {
        visitId,
        encounterId,
        patientId,
        createdBy:
          row.createdBy == null
            ? null
            : resolveUserFk(ctx, cfg.entity, row.id, "createdBy", row.createdBy),
        updatedBy:
          row.updatedBy == null
            ? null
            : resolveUserFk(ctx, cfg.entity, row.id, "updatedBy", row.updatedBy),
        deletedBy:
          row.deletedBy == null
            ? null
            : resolveUserFk(ctx, cfg.entity, row.id, "deletedBy", row.deletedBy),
      };

      if (ctx.dryRun) {
        await idMap.set(cfg.entity, row.id, randomUUID());
        report.inserted(cfg.entity);
        continue;
      }

      const values = cfg.toValues(row, resolved);
      const [inserted] = await db
        .insert(cfg.target)
        .values(values as never)
        .returning({ id: cfg.idColumn });

      await idMap.set(cfg.entity, row.id, inserted.id as string);
      report.inserted(cfg.entity);
    }
  }
  report.setV1Count(cfg.entity, total);
}

// ---------------------------------------------------------------------------
// Per-table row shapes + configs
// ---------------------------------------------------------------------------

interface V1Vital extends BaseChildRow {
  diastolic: number | null;
  systolic: number | null;
  temperature: number;
  pulse: number | null;
  respiratoryRate: number;
  spo2: number;
  weight: number | null;
  height: number | null;
}

interface V1Complaint extends BaseChildRow {
  title: string;
  description: string;
  duration: number | null;
  durationUnit: string;
  severity: string;
}

interface V1History extends BaseChildRow {
  medical: string;
  surgical: string;
  obGyn: string;
  medication: string;
  familyHistory: string;
  social: string;
  other: string | null;
}

interface V1Test extends BaseChildRow {
  testName: string;
  testResult: string | null;
  testCategory: string;
}

interface V1Diagnosis extends BaseChildRow {
  description: string;
  icdCode?: string | null;
}

interface V1Treatment extends BaseChildRow {
  medicalAdvise: string | null;
  followUpText: string | null;
  followUpDate: string | null;
  refer: string | null;
  referReason: string | null;
}

interface V1Medication extends BaseChildRow {
  type: string | null;
  medicineName: string | null;
  dosage: string | null;
  times: string | null;
  route: string | null;
  beforeAfter: string | null;
  duration: string | null;
  specialNotes: string | null;
}

interface V1Document extends BaseChildRow {
  name: string | null;
  path: string | null;
}

const AUDIT_SNAKE = `created_by AS "createdBy", updated_by AS "updatedBy",
  deleted_by AS "deletedBy", created_at AS "createdAt",
  updated_at AS "updatedAt", deleted_at AS "deletedAt"`;
const AUDIT_CAMEL = `"createdBy", "updatedBy", "deletedBy",
  "createdAt", "updatedAt", "deletedAt"`;

export const clinicalStep: MigrationStep = {
  key: "clinical",
  title: "Clinical children (vitals, complaints, dx, tests, meds, docs)",
  async run(ctx: MigrationContext): Promise<void> {
    // vital (snake_case table + columns)
    await runChild<V1Vital>(ctx, {
      entity: "vital",
      v1Table: `vital`,
      selectCols: `id, diastolic, systolic, temperature, pulse,
        respiratory_rate AS "respiratoryRate", spo2, weight, height,
        encounter_id AS "encounterId", ${AUDIT_SNAKE}`,
      target: vitals,
      idColumn: vitals.id,
      requireVisit: true,
      requirePatient: false,
      toValues: (row, r) => ({
        diastolic: row.diastolic ?? null,
        systolic: row.systolic ?? null,
        temperature: row.temperature,
        pulse: row.pulse ?? null,
        respiratoryRate: row.respiratoryRate,
        spo2: row.spo2,
        weight: row.weight ?? null,
        height: row.height ?? null,
        visitId: r.visitId!,
        encounterId: r.encounterId,
        createdBy: r.createdBy,
        updatedBy: r.updatedBy,
        deletedBy: r.deletedBy,
        createdAt: row.createdAt ?? new Date(),
        updatedAt: row.updatedAt ?? null,
        deletedAt: row.deletedAt ?? null,
      }),
    });

    // complaint (snake)
    await runChild<V1Complaint>(ctx, {
      entity: "complaint",
      v1Table: `complaint`,
      selectCols: `id, title, description, duration,
        duration_unit AS "durationUnit", severity,
        patient_id AS "patientId", encounter_id AS "encounterId", ${AUDIT_SNAKE}`,
      target: complaints,
      idColumn: complaints.id,
      requireVisit: true,
      requirePatient: true,
      toValues: (row, r) => ({
        title: trunc(row.title, 500) ?? "Not recorded",
        duration: row.duration ?? null,
        durationUnit: mapDurationUnit(row.durationUnit, ctx.report) ?? "days",
        severity: mapSeverity(row.severity, ctx.report) ?? "medium",
        description: row.description ?? "",
        patientId: r.patientId!,
        visitId: r.visitId!,
        encounterId: r.encounterId,
        createdBy: r.createdBy,
        updatedBy: r.updatedBy,
        deletedBy: r.deletedBy,
        createdAt: row.createdAt ?? new Date(),
        updatedAt: row.updatedAt ?? null,
        deletedAt: row.deletedAt ?? null,
      }),
    });

    // history (snake)
    await runChild<V1History>(ctx, {
      entity: "history",
      v1Table: `history`,
      selectCols: `id, medical, surgical, ob_gyn AS "obGyn", medication,
        family_history AS "familyHistory", social, other,
        encounter_id AS "encounterId", ${AUDIT_SNAKE}`,
      target: histories,
      idColumn: histories.id,
      requireVisit: true,
      requirePatient: false,
      toValues: (row, r) => ({
        medical: row.medical ?? TEXT,
        surgical: row.surgical ?? TEXT,
        obGyn: row.obGyn ?? TEXT,
        medication: row.medication ?? TEXT,
        familyHistory: row.familyHistory ?? TEXT,
        social: row.social ?? TEXT,
        other: row.other ?? null,
        visitId: r.visitId!,
        encounterId: r.encounterId,
        createdBy: r.createdBy,
        updatedBy: r.updatedBy,
        deletedBy: r.deletedBy,
        createdAt: row.createdAt ?? new Date(),
        updatedAt: row.updatedAt ?? null,
        deletedAt: row.deletedAt ?? null,
      }),
    });

    // test (snake)
    await runChild<V1Test>(ctx, {
      entity: "test",
      v1Table: `test`,
      selectCols: `id, test_name AS "testName", test_result AS "testResult",
        test_category AS "testCategory",
        encounter_id AS "encounterId", ${AUDIT_SNAKE}`,
      target: tests,
      idColumn: tests.id,
      requireVisit: true,
      requirePatient: false,
      toValues: (row, r) => ({
        testName: trunc(row.testName, 255) ?? "Not recorded",
        testResult: row.testResult ?? null,
        testCategory: mapTestCategory(row.testCategory, ctx.report),
        visitId: r.visitId!,
        encounterId: r.encounterId,
        createdBy: r.createdBy,
        updatedBy: r.updatedBy,
        deletedBy: r.deletedBy,
        createdAt: row.createdAt ?? new Date(),
        updatedAt: row.updatedAt ?? null,
        deletedAt: row.deletedAt ?? null,
      }),
    });

    // ProvisionalDiagnosis (camel)
    await runChild<V1Diagnosis>(ctx, {
      entity: "provisional_diagnosis",
      v1Table: `"ProvisionalDiagnosis"`,
      selectCols: `id, description, "patientId", "encounterId", ${AUDIT_CAMEL}`,
      target: provisional_diagnoses,
      idColumn: provisional_diagnoses.id,
      requireVisit: true,
      requirePatient: true,
      toValues: (row, r) => ({
        description: row.description ?? "",
        patientId: r.patientId!,
        visitId: r.visitId!,
        encounterId: r.encounterId,
        createdBy: r.createdBy,
        updatedBy: r.updatedBy,
        deletedBy: r.deletedBy,
        createdAt: row.createdAt ?? new Date(),
        updatedAt: row.updatedAt ?? null,
        deletedAt: row.deletedAt ?? null,
      }),
    });

    // ConfirmDiagnosis (camel) — carries icdCode
    await runChild<V1Diagnosis>(ctx, {
      entity: "confirm_diagnosis",
      v1Table: `"ConfirmDiagnosis"`,
      selectCols: `id, description, "icdCode", "patientId", "encounterId", ${AUDIT_CAMEL}`,
      target: confirm_diagnoses,
      idColumn: confirm_diagnoses.id,
      requireVisit: true,
      requirePatient: true,
      toValues: (row, r) => ({
        icdCode: trunc(row.icdCode, 50),
        description: row.description ?? "",
        patientId: r.patientId!,
        visitId: r.visitId!,
        encounterId: r.encounterId,
        createdBy: r.createdBy,
        updatedBy: r.updatedBy,
        deletedBy: r.deletedBy,
        createdAt: row.createdAt ?? new Date(),
        updatedAt: row.updatedAt ?? null,
        deletedAt: row.deletedAt ?? null,
      }),
    });

    // Treatment (camel) — followUpDate is free text -> parse/fold
    await runChild<V1Treatment>(ctx, {
      entity: "treatment",
      v1Table: `"Treatment"`,
      selectCols: `id, "medicalAdvise", "followUpText", "followUpDate",
        refer, "referReason", "patientId", "encounterId", ${AUDIT_CAMEL}`,
      target: treatments,
      idColumn: treatments.id,
      requireVisit: true,
      requirePatient: true,
      toValues: (row, r) => {
        const { followUpDate, followUpText } = parseFollowUp(
          row.followUpDate,
          row.followUpText,
        );
        return {
          medicalAdvise: row.medicalAdvise?.trim() || null,
          followUpText,
          followUpDate,
          refer: trunc(row.refer, 255),
          referReason: row.referReason?.trim() || null,
          patientId: r.patientId!,
          visitId: r.visitId!,
          encounterId: r.encounterId,
          createdBy: r.createdBy,
          updatedBy: r.updatedBy,
          deletedBy: r.deletedBy,
          createdAt: row.createdAt ?? new Date(),
          updatedAt: row.updatedAt ?? null,
          deletedAt: row.deletedAt ?? null,
        };
      },
    });

    // Medication (camel)
    await runChild<V1Medication>(ctx, {
      entity: "medication",
      v1Table: `"Medication"`,
      selectCols: `id, type, "medicineName", dosage, times, route,
        "beforeAfter", duration, "specialNotes",
        "patientId", "encounterId", ${AUDIT_CAMEL}`,
      target: medications,
      idColumn: medications.id,
      requireVisit: true,
      requirePatient: true,
      toValues: (row, r) => ({
        type: trunc(row.type, 100),
        medicineName: trunc(row.medicineName, 500),
        dosage: trunc(row.dosage, 255),
        times: trunc(row.times, 100),
        route: trunc(row.route, 100),
        beforeAfter: trunc(row.beforeAfter, 50),
        duration: trunc(row.duration, 100),
        specialNotes: row.specialNotes?.trim() || null,
        patientId: r.patientId!,
        visitId: r.visitId!,
        encounterId: r.encounterId,
        createdBy: r.createdBy,
        updatedBy: r.updatedBy,
        deletedBy: r.deletedBy,
        createdAt: row.createdAt ?? new Date(),
        updatedAt: row.updatedAt ?? null,
        deletedAt: row.deletedAt ?? null,
      }),
    });

    // Document (camel) — v2 documents has NO encounter_id; visit_id is nullable,
    // so a document whose v1 encounter is unmapped still migrates (visitId null).
    await runChild<V1Document>(ctx, {
      entity: "document",
      v1Table: `"Document"`,
      selectCols: `id, name, path, "patientId", "encounterId", ${AUDIT_CAMEL}`,
      target: documents,
      idColumn: documents.id,
      requireVisit: false,
      requirePatient: true,
      toValues: (row, r) => ({
        name: trunc(row.name, 500),
        path: row.path?.trim() || null,
        patientId: r.patientId!,
        visitId: r.visitId,
        createdBy: r.createdBy,
        updatedBy: r.updatedBy,
        deletedBy: r.deletedBy,
        createdAt: row.createdAt ?? new Date(),
        updatedAt: row.updatedAt ?? null,
        deletedAt: row.deletedAt ?? null,
      }),
    });
  },
};
