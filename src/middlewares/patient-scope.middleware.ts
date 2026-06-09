import { NextFunction, Response } from "express";
import { and, eq, inArray, isNull } from "drizzle-orm";

import { db } from "../db";
import { appointments, patients, pregnancies, visits } from "../db/schema";
import { AuthRequest } from "./auth.middleware";
import { AppError } from "../utils/app-error";
import { HTTP_STATUS } from "../config/constants";
import { isDoctor } from "../constants/rbac";
import { setRequestContext } from "../utils/request-context";
import { logger } from "../utils/logger";

/**
 * Care-relationship cross-facility patient scope.
 *
 * Patients are facility-scoped, but doctors are global, cross-facility
 * clinicians: a patient can book a telehealth consult with any doctor. When the
 * doctor opens that patient (detail page, clinical history) their own facility
 * scope would 404 the record. This middleware grants a *narrow* exception:
 *
 *   if the request targets a patient in another facility, AND the caller is a
 *   doctor, AND an appointment links that doctor to that patient, then rewrite
 *   `req.context.facilityId` to the patient's facility for this request only.
 *
 * Every downstream `withFacilityScope(...)` query then operates against the
 * patient's facility with no per-endpoint changes. Because the targeted routes
 * also filter by that same `patientId`, the doctor only ever sees the one
 * patient they're treating — never the rest of that facility.
 *
 * Safe by construction: keyed off the authenticated doctor's own `userId`
 * (never client input); non-doctors and doctors without a relationship fall
 * through unchanged, so the controller's normal facility-scoped 404 stands.
 */

// Appointment states that still constitute an active care relationship. A
// cancelled appointment does not grant access.
const CARE_RELATIONSHIP_STATUSES = [
  "scheduled",
  "confirmed",
  "completed",
] as const;

type PatientIdResolver = (
  req: AuthRequest,
) => string | undefined | Promise<string | undefined>;

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

async function resolvePatientFacilityId(
  patientId: string,
): Promise<string | null | undefined> {
  const [row] = await db
    .select({ facilityId: patients.facilityId })
    .from(patients)
    .where(and(eq(patients.id, patientId), isNull(patients.deletedAt)))
    .limit(1);
  return row?.facilityId;
}

async function hasDoctorPatientRelationship(
  doctorId: string,
  patientId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.doctorId, doctorId),
        eq(appointments.patientId, patientId),
        isNull(appointments.deletedAt),
        inArray(appointments.status, [...CARE_RELATIONSHIP_STATUSES]),
      ),
    )
    .limit(1);
  return Boolean(row);
}

function makePatientScope(resolve: PatientIdResolver) {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      const ctx = req.context;
      if (!ctx) {
        return next(new AppError("Unauthorized", HTTP_STATUS.UNAUTHORIZED));
      }

      const patientId = await resolve(req);
      // No patient in the request, or it can't be resolved → nothing to widen.
      if (!patientId) return next();

      const patientFacilityId = await resolvePatientFacilityId(patientId);
      // Unknown patient, or already in the caller's facility → leave the
      // normal facility scope in place (the controller handles same-facility
      // reads and 404s as before).
      if (!patientFacilityId || patientFacilityId === ctx.facilityId) {
        return next();
      }

      if (!isDoctor(ctx.role)) return next();

      if (!(await hasDoctorPatientRelationship(ctx.userId, patientId))) {
        return next();
      }

      // Grant: operate within the patient's facility for this request only.
      ctx.facilityId = patientFacilityId;
      setRequestContext({ facilityId: patientFacilityId });
      logger.audit("patient.cross_facility.granted", {
        userId: ctx.userId,
        patientId,
        patientFacilityId,
      });
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

/** Patient id from a query param (default `patientId`). */
export const patientScopeFromQuery = (key = "patientId") =>
  makePatientScope((req) => readString(req.query?.[key]));

/** Patient id from a path param (default `id`, e.g. `GET /patients/:id`). */
export const patientScopeFromParam = (key = "id") =>
  makePatientScope((req) => readString(req.params?.[key]));

/**
 * Attachments are polymorphic; only treat them as patient-scoped when the
 * request is explicitly `sourceType=Patient`, using `sourceId` as the patient.
 */
export const patientScopeFromAttachment = () =>
  makePatientScope((req) =>
    readString(req.query?.sourceType) === "Patient"
      ? readString(req.query?.sourceId)
      : undefined,
  );

/** Resolve the patient from a visit path param (`GET /visits/:visitId`). */
export const patientScopeFromVisitParam = (key = "visitId") =>
  makePatientScope(async (req) => {
    const visitId = readString(req.params?.[key]);
    if (!visitId) return undefined;
    const [row] = await db
      .select({ patientId: visits.patientId })
      .from(visits)
      .where(eq(visits.id, visitId))
      .limit(1);
    return row?.patientId ?? undefined;
  });

/** Resolve the patient from a pregnancy path param. */
export const patientScopeFromPregnancyParam = (key = "pregnancyId") =>
  makePatientScope(async (req) => {
    const pregnancyId = readString(req.params?.[key]);
    if (!pregnancyId) return undefined;
    const [row] = await db
      .select({ patientId: pregnancies.patientId })
      .from(pregnancies)
      .where(eq(pregnancies.id, pregnancyId))
      .limit(1);
    return row?.patientId ?? undefined;
  });
