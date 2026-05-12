import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "../../../db";
import { encounters, patients, person_names } from "../../../db/schema";
import type { EncounterHit } from "../types";
import type { SearchRunner } from "./runner-types";

/**
 * Encounter search runner. Matches encounters by:
 *   - the patient's name (trigram)
 *   - the encounter's reason text (trigram)
 *
 * Scope mirrors the visits runner exactly.
 */
export const searchEncounters: SearchRunner<EncounterHit> = async ({
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
  const reasonSim = sql<number>`coalesce(similarity(${encounters.reason}, ${trimmed}), 0)`;

  const doctorBoost = scope.ownDoctorBoostUserId
    ? sql<number>`case when ${encounters.doctorId} = ${scope.ownDoctorBoostUserId} then 0.15 else 0 end`
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
    isNull(encounters.deletedAt),
    scope.facilityIdFilter
      ? eq(encounters.facilityId, scope.facilityIdFilter)
      : undefined,
    scope.assignedPatientIds
      ? inArray(encounters.patientId, scope.assignedPatientIds)
      : undefined,
    or(
      sql`(${person_names.given} % ${trimmed})`,
      sql`(${person_names.family} % ${trimmed})`,
      sql`(${encounters.reason} % ${trimmed})`,
    ),
  );

  const rows = await db
    .select({
      id: encounters.id,
      visitId: encounters.visitId,
      patientId: encounters.patientId,
      encounterAt: encounters.encounterAt,
      encounterType: encounters.encounterType,
      reason: encounters.reason,
      status: encounters.status,
      patientGiven: person_names.given,
      patientFamily: person_names.family,
      score,
      matchedField,
    })
    .from(encounters)
    .innerJoin(patients, eq(patients.id, encounters.patientId))
    .leftJoin(
      person_names,
      and(
        eq(person_names.personId, patients.personId),
        eq(person_names.isPrimary, true),
      ),
    )
    .where(where)
    .orderBy(sql`${score} desc`, sql`${encounters.encounterAt} desc`)
    .limit(limit);

  const results: EncounterHit[] = rows.map((row) => {
    const patientName =
      [row.patientGiven, row.patientFamily].filter(Boolean).join(" ") || "Patient";
    const subtitleParts = [
      row.encounterAt instanceof Date ? row.encounterAt.toISOString() : row.encounterAt,
      row.encounterType,
      row.reason,
      row.status,
    ].filter(Boolean);
    return {
      type: "encounter",
      id: row.id,
      title: patientName,
      subtitle: subtitleParts.join(" · "),
      context: {
        encounter_id: row.id,
        visit_id: row.visitId,
        patient_id: row.patientId,
      },
      matched_field: row.matchedField,
      score: Number(row.score),
    };
  });

  return { total: results.length, results };
};
