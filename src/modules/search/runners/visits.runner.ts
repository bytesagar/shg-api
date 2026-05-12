import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "../../../db";
import { patients, person_names, visits } from "../../../db/schema";
import type { VisitHit } from "../types";
import type { SearchRunner } from "./runner-types";

/**
 * Visit search runner. Matches visits by:
 *   - the patient's name (trigram)
 *   - the visit's reason text (trigram)
 *
 * Subtitle composes the visit date + status + service.
 *
 * Scope:
 *   - admin   : unrestricted (+ optional facility override)
 *   - facility/doctor/nurse/etc : visits at the user's facility
 *   - fchv    : narrowed to visits of assigned patients
 *   - user    : not returned (self-only roles only see appointments)
 *   - doctor  : +0.15 score boost when the visit's doctor is the searcher
 */
export const searchVisits: SearchRunner<VisitHit> = async ({
  scope,
  q,
  limit,
}) => {
  if (scope.ownAppointmentsOnlyForUserId) {
    return { total: 0, results: [] };
  }
  if (scope.assignedPatientIds && scope.assignedPatientIds.length === 0) {
    return { total: 0, results: [] };
  }

  const trimmed = q.trim();
  if (trimmed.length === 0) return { total: 0, results: [] };

  const givenSim = sql<number>`coalesce(similarity(${person_names.given}, ${trimmed}), 0)`;
  const familySim = sql<number>`coalesce(similarity(${person_names.family}, ${trimmed}), 0)`;
  const reasonSim = sql<number>`coalesce(similarity(${visits.reason}, ${trimmed}), 0)`;

  const doctorBoost = scope.ownDoctorBoostUserId
    ? sql<number>`case when ${visits.doctorId} = ${scope.ownDoctorBoostUserId} then 0.15 else 0 end`
    : sql<number>`0`;

  const score = sql<number>`greatest(${givenSim}, ${familySim}, ${reasonSim}) + ${doctorBoost}`;

  const matchedField = sql<string>`
    case
      when ${givenSim} >= ${familySim} and ${givenSim} >= ${reasonSim}
        then 'patient_given_name'
      when ${familySim} >= ${reasonSim}
        then 'patient_family_name'
      else 'reason'
    end
  `;

  const where = and(
    isNull(visits.deletedAt),
    scope.facilityIdFilter
      ? eq(visits.facilityId, scope.facilityIdFilter)
      : undefined,
    scope.assignedPatientIds
      ? inArray(visits.patientId, scope.assignedPatientIds)
      : undefined,
    or(
      sql`(${person_names.given} % ${trimmed})`,
      sql`(${person_names.family} % ${trimmed})`,
      sql`(${visits.reason} % ${trimmed})`,
    ),
  );

  const rows = await db
    .select({
      id: visits.id,
      patientId: visits.patientId,
      date: visits.date,
      reason: visits.reason,
      service: visits.service,
      status: visits.status,
      patientGiven: person_names.given,
      patientFamily: person_names.family,
      score,
      matchedField,
    })
    .from(visits)
    .innerJoin(patients, eq(patients.id, visits.patientId))
    .leftJoin(
      person_names,
      and(
        eq(person_names.personId, patients.personId),
        eq(person_names.isPrimary, true),
      ),
    )
    .where(where)
    .orderBy(sql`${score} desc`, sql`${visits.date} desc`)
    .limit(limit);

  const results: VisitHit[] = rows.map((row) => {
    const patientName =
      [row.patientGiven, row.patientFamily].filter(Boolean).join(" ") || "Patient";
    const subtitleParts = [row.date, row.reason, row.service, row.status].filter(
      Boolean,
    );
    return {
      type: "visit",
      id: row.id,
      title: patientName,
      subtitle: subtitleParts.join(" · "),
      context: {
        visit_id: row.id,
        patient_id: row.patientId,
      },
      matched_field: row.matchedField,
      score: Number(row.score),
    };
  });

  return { total: results.length, results };
};
