import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "../../../db";
import {
  appointments,
  patients,
  person_names,
  users,
} from "../../../db/schema";
import type { AppointmentHit } from "../types";
import type { SearchRunner } from "./runner-types";

/**
 * Appointment search runner. Matches appointments by the patient's name,
 * the doctor's name, or the appointment service. Subtitle carries the
 * appointment date and the doctor's name.
 *
 * Scope rules per the plan:
 *   - admin   : unrestricted, optional facility override
 *   - facility/doctor/fchv/nurse/etc : appointments at the user's facility
 *   - fchv    : further narrowed to appointments where the patient is on
 *               the FCHV's caseload (via `scope.assignedPatientIds`)
 *   - user    : only own appointments (`appointments.patient_id` ?
 *               there is no user_id; for now we match on `patient_id`
 *               by checking the patient row belongs to the user's person.
 *               In Phase 1 we approximate "own" by matching the user as
 *               the patient via the `users.personId -> patients.personId`
 *               relationship; the plan flags this as a Phase 1 simplification)
 *   - doctor  : own-doctor recency boost in scoring (no filter, just rank)
 */
export const searchAppointments: SearchRunner<AppointmentHit> = async ({
  scope,
  q,
  limit,
}) => {
  if (scope.assignedPatientIds && scope.assignedPatientIds.length === 0) {
    return { total: 0, results: [] };
  }

  const trimmed = q.trim();
  if (trimmed.length === 0) return { total: 0, results: [] };

  // Aliases for joining patient name vs doctor name (both via users/persons).
  const patientGivenSim = sql<number>`coalesce(similarity(${person_names.given}, ${trimmed}), 0)`;
  const patientFamilySim = sql<number>`coalesce(similarity(${person_names.family}, ${trimmed}), 0)`;
  const doctorFirstSim = sql<number>`coalesce(similarity(${users.firstName}, ${trimmed}), 0)`;
  const doctorLastSim = sql<number>`coalesce(similarity(${users.lastName}, ${trimmed}), 0)`;
  const serviceSim = sql<number>`coalesce(similarity(${appointments.service}, ${trimmed}), 0)`;

  // Doctor-recency boost: +0.15 when the appointment's doctor is the
  // searching doctor. Additive boost rather than multiplicative so it
  // doesn't reorder above genuinely strong text matches.
  const doctorBoost = scope.ownDoctorBoostUserId
    ? sql<number>`case when ${appointments.doctorId} = ${scope.ownDoctorBoostUserId} then 0.15 else 0 end`
    : sql<number>`0`;

  const score = sql<number>`
    greatest(
      ${patientGivenSim},
      ${patientFamilySim},
      ${doctorFirstSim},
      ${doctorLastSim},
      ${serviceSim}
    ) + ${doctorBoost}
  `;

  const matchedField = sql<string>`
    case
      when ${patientGivenSim} >= ${patientFamilySim}
        and ${patientGivenSim} >= ${doctorFirstSim}
        and ${patientGivenSim} >= ${doctorLastSim}
        and ${patientGivenSim} >= ${serviceSim}
        then 'patient_given_name'
      when ${patientFamilySim} >= ${doctorFirstSim}
        and ${patientFamilySim} >= ${doctorLastSim}
        and ${patientFamilySim} >= ${serviceSim}
        then 'patient_family_name'
      when ${doctorFirstSim} >= ${doctorLastSim}
        and ${doctorFirstSim} >= ${serviceSim}
        then 'doctor_first_name'
      when ${doctorLastSim} >= ${serviceSim}
        then 'doctor_last_name'
      else 'service'
    end
  `;

  // Self-only scope (user/patient role): narrow to appointments where the
  // patient's person matches the user's person. Done with an EXISTS rather
  // than another join to keep the result one row per appointment.
  const selfOnlyClause = scope.ownAppointmentsOnlyForUserId
    ? sql`exists (
        select 1
        from ${patients} sp
        inner join ${users} su on su.person_id = sp.person_id
        where sp.id = ${appointments.patientId}
          and su.id = ${scope.ownAppointmentsOnlyForUserId}
      )`
    : undefined;

  const where = and(
    isNull(appointments.deletedAt),
    scope.facilityIdFilter
      ? eq(appointments.facilityId, scope.facilityIdFilter)
      : undefined,
    scope.assignedPatientIds
      ? inArray(appointments.patientId, scope.assignedPatientIds)
      : undefined,
    selfOnlyClause,
    or(
      sql`(${person_names.given} % ${trimmed})`,
      sql`(${person_names.family} % ${trimmed})`,
      sql`(${users.firstName} % ${trimmed})`,
      sql`(${users.lastName} % ${trimmed})`,
      sql`(coalesce(${appointments.service}, '') % ${trimmed})`,
    ),
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
      score,
      matchedField,
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
    .orderBy(sql`${score} desc`, sql`${appointments.date} desc`)
    .limit(limit);

  const results: AppointmentHit[] = rows.map((row) => {
    const patientName =
      [row.patientGiven, row.patientFamily].filter(Boolean).join(" ") || "Patient";
    const doctorName =
      [row.doctorFirstName, row.doctorLastName].filter(Boolean).join(" ") || "Doctor";
    const subtitleParts = [
      row.date,
      `Dr. ${doctorName}`,
      row.service,
      row.status,
    ].filter(Boolean);
    return {
      type: "appointment",
      id: row.id,
      title: patientName,
      subtitle: subtitleParts.join(" · "),
      context: {
        appointment_id: row.id,
        patient_id: row.patientId,
        doctor_id: row.doctorId,
      },
      matched_field: row.matchedField,
      score: Number(row.score),
    };
  });

  return { total: results.length, results };
};
