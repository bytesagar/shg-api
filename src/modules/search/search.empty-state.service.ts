import { and, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  appointments,
  audit_events,
  encounters,
  patients,
  person_names,
  persons,
  users,
} from "../../db/schema";
import { RBAC_ROLES, normalizeRole } from "../../constants/rbac";
import { buildSearchScope } from "./search.scope";
import type {
  AppointmentHit,
  EmptyStateResponse,
  PatientHit,
  ScopeContext,
} from "./types";

const EMPTY_STATE_LIMIT = 5;

/**
 * Empty-state composer. Returns:
 *   - `upcoming_appointments`: next 5 appointments. Doctor sees own; other
 *     facility roles see the facility's; user/patient sees own.
 *   - `recent_patients`: last 5 patients the current user touched, ordered
 *     by their most recent audit_event. Falls back to encounters.created_by
 *     when audit_events has no rows (the plan flags this fallback).
 *
 * Cached on the route side (per the plan, ~30s TTL, invalidated on
 * appointment mutations). This service itself does no caching - just
 * composes the response.
 */
export async function getEmptyState(ctx: ScopeContext): Promise<EmptyStateResponse> {
  const scope = await buildSearchScope(ctx, null);
  const role = normalizeRole(ctx.role) ?? ctx.role;

  const upcoming = await loadUpcomingAppointments({
    role,
    userId: ctx.userId,
    facilityId: scope.facilityIdFilter,
    assignedPatientIds: scope.assignedPatientIds,
    ownAppointmentsOnlyForUserId: scope.ownAppointmentsOnlyForUserId,
  });

  const recent = await loadRecentPatients({
    userId: ctx.userId,
    facilityId: scope.facilityIdFilter,
    assignedPatientIds: scope.assignedPatientIds,
  });

  return {
    upcoming_appointments: upcoming,
    recent_patients: recent,
  };
}

async function loadUpcomingAppointments(params: {
  role: string;
  userId: string;
  facilityId: string | null;
  assignedPatientIds: string[] | null;
  ownAppointmentsOnlyForUserId: string | null;
}): Promise<AppointmentHit[]> {
  if (params.assignedPatientIds && params.assignedPatientIds.length === 0) {
    return [];
  }

  const today = sql`current_date`;

  // Doctor sees their own upcoming; user/patient sees own (via patient->person).
  const isDoctor = params.role === RBAC_ROLES.DOCTOR;

  const selfClause = params.ownAppointmentsOnlyForUserId
    ? sql`exists (
        select 1 from ${patients} sp
        inner join ${users} su on su.person_id = sp.person_id
        where sp.id = ${appointments.patientId}
          and su.id = ${params.ownAppointmentsOnlyForUserId}
      )`
    : undefined;

  const where = and(
    isNull(appointments.deletedAt),
    gte(appointments.date, sql`${today}`),
    inArray(appointments.status, ["scheduled", "confirmed"]),
    params.facilityId ? eq(appointments.facilityId, params.facilityId) : undefined,
    params.assignedPatientIds
      ? inArray(appointments.patientId, params.assignedPatientIds)
      : undefined,
    isDoctor ? eq(appointments.doctorId, params.userId) : undefined,
    selfClause,
  );

  const rows = await db
    .select({
      id: appointments.id,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      date: appointments.date,
      service: appointments.service,
      status: appointments.status,
      patientGiven: person_names.given,
      patientFamily: person_names.family,
      doctorFirstName: users.firstName,
      doctorLastName: users.lastName,
    })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .leftJoin(
      person_names,
      and(
        eq(person_names.personId, patients.personId),
        eq(person_names.isPrimary, true),
      ),
    )
    .leftJoin(users, eq(users.id, appointments.doctorId))
    .where(where)
    .orderBy(appointments.date)
    .limit(EMPTY_STATE_LIMIT);

  return rows.map((row) => {
    const patientName =
      [row.patientGiven, row.patientFamily].filter(Boolean).join(" ") || "Patient";
    const doctorName =
      [row.doctorFirstName, row.doctorLastName].filter(Boolean).join(" ") || "Doctor";
    return {
      type: "appointment",
      id: row.id,
      title: patientName,
      subtitle: [row.date, `Dr. ${doctorName}`, row.service, row.status]
        .filter(Boolean)
        .join(" · "),
      context: {
        appointment_id: row.id,
        patient_id: row.patientId,
        doctor_id: row.doctorId,
      },
      matched_field: "upcoming",
      score: 1,
    };
  });
}

async function loadRecentPatients(params: {
  userId: string;
  facilityId: string | null;
  assignedPatientIds: string[] | null;
}): Promise<PatientHit[]> {
  if (params.assignedPatientIds && params.assignedPatientIds.length === 0) {
    return [];
  }

  // Primary source: audit_events. Group by patient, take max(createdAt).
  const auditRows = await db
    .select({
      patientId: audit_events.patientId,
      lastTouched: sql<Date>`max(${audit_events.createdAt})`,
    })
    .from(audit_events)
    .where(
      and(
        eq(audit_events.actorUserId, params.userId),
        sql`${audit_events.patientId} is not null`,
        params.facilityId
          ? eq(audit_events.facilityId, params.facilityId)
          : undefined,
      ),
    )
    .groupBy(audit_events.patientId)
    .orderBy(sql`max(${audit_events.createdAt}) desc`)
    .limit(EMPTY_STATE_LIMIT);

  let patientIds = auditRows
    .map((r) => r.patientId)
    .filter((id): id is string => Boolean(id));

  // Fallback: encounters this user created, when audit_events is empty.
  // The plan calls this out explicitly.
  if (patientIds.length === 0) {
    const encRows = await db
      .select({
        patientId: encounters.patientId,
        lastTouched: sql<Date>`max(${encounters.createdAt})`,
      })
      .from(encounters)
      .where(
        and(
          eq(encounters.createdBy, params.userId),
          isNull(encounters.deletedAt),
          params.facilityId
            ? eq(encounters.facilityId, params.facilityId)
            : undefined,
        ),
      )
      .groupBy(encounters.patientId)
      .orderBy(sql`max(${encounters.createdAt}) desc`)
      .limit(EMPTY_STATE_LIMIT);
    patientIds = encRows.map((r) => r.patientId);
  }

  if (patientIds.length === 0) return [];

  // For FCHV: intersect with the caseload.
  const filteredIds = params.assignedPatientIds
    ? patientIds.filter((id) => params.assignedPatientIds!.includes(id))
    : patientIds;

  if (filteredIds.length === 0) return [];

  // Hydrate names + facility for the response shape.
  const rows = await db
    .select({
      id: patients.id,
      patientId: patients.patientId,
      facilityId: patients.facilityId,
      gender: persons.gender,
      given: person_names.given,
      middle: person_names.middle,
      family: person_names.family,
    })
    .from(patients)
    .innerJoin(persons, eq(persons.id, patients.personId))
    .leftJoin(
      person_names,
      and(
        eq(person_names.personId, patients.personId),
        eq(person_names.isPrimary, true),
      ),
    )
    .where(
      and(
        inArray(patients.id, filteredIds),
        isNull(patients.deletedAt),
      ),
    );

  // Preserve the "most recently touched" order from the audit/encounter query.
  const byId = new Map(rows.map((r) => [r.id, r]));
  return filteredIds
    .map((id) => byId.get(id))
    .filter((r): r is (typeof rows)[number] => Boolean(r))
    .map((row) => {
      const title =
        [row.given, row.middle, row.family].filter(Boolean).join(" ") || row.patientId;
      return {
        type: "patient",
        id: row.id,
        title,
        subtitle: [row.patientId, row.gender].filter(Boolean).join(" · "),
        context: {
          patient_id: row.id,
          facility_id: row.facilityId,
        },
        matched_field: "recent",
        score: 1,
      };
    });
}

