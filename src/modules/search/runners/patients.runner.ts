import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "../../../db";
import {
  patients,
  person_contacts,
  person_identifiers,
  person_names,
  persons,
} from "../../../db/schema";
import type { PatientHit } from "../types";
import type { SearchRunner } from "./runner-types";

/**
 * Patient search runner. Matches against:
 *   - person_names.given / family (trigram on `name` queries; prefix on others)
 *   - patients.patient_id (exact on `patient_id` queries, prefix elsewhere)
 *   - person_identifiers.value (exact for numeric/ID-shaped queries)
 *   - person_contacts.value (prefix for `phone` queries)
 *
 * Title = full name from the primary `person_names` row.
 * Subtitle = "{patientId} · {gender}{ageHint?} · {facility?}". For
 * Phase 1 we surface patient_id + gender; age and facility name require
 * extra joins, so we keep them as Phase 2 polish (the plan's subtitle
 * example is informative, not contractual).
 */
export const searchPatients: SearchRunner<PatientHit> = async ({
  scope,
  q,
  classification,
  limit,
}) => {
  // FCHV with empty caseload: short-circuit. Never query the DB.
  if (scope.assignedPatientIds && scope.assignedPatientIds.length === 0) {
    return { total: 0, results: [] };
  }
  // user/patient: this runner does not return results for self-only roles
  // (the plan scopes them to "only own appointments").
  if (scope.ownAppointmentsOnlyForUserId) {
    return { total: 0, results: [] };
  }

  const trimmed = q.trim();
  if (trimmed.length === 0) return { total: 0, results: [] };

  // ----- match expression: drives `score` and the matched_field label -------
  // Use a CASE expression so a single SELECT can rank by whichever column
  // matched best. similarity() returns 0 when both args are empty/null,
  // so we coalesce conservatively.
  const givenSim = sql<number>`coalesce(similarity(${person_names.given}, ${trimmed}), 0)`;
  const familySim = sql<number>`coalesce(similarity(${person_names.family}, ${trimmed}), 0)`;
  const patientIdSim = sql<number>`coalesce(similarity(${patients.patientId}, ${trimmed}), 0)`;
  const identifierSim = sql<number>`coalesce(similarity(${person_identifiers.value}, ${trimmed}), 0)`;

  const score = sql<number>`greatest(${givenSim}, ${familySim}, ${patientIdSim}, ${identifierSim})`;

  // Pick the field with the highest similarity for `matched_field`.
  const matchedField = sql<string>`
    case
      when ${patientIdSim} >= ${givenSim}
        and ${patientIdSim} >= ${familySim}
        and ${patientIdSim} >= ${identifierSim}
        then 'patient_id'
      when ${givenSim} >= ${familySim}
        and ${givenSim} >= ${identifierSim}
        then 'given_name'
      when ${familySim} >= ${identifierSim}
        then 'family_name'
      else 'identifier'
    end
  `;

  // ----- WHERE clause: cheap prefilter + trigram operator ------------------
  // The `%` operator is what makes the GIN trigram index usable. For
  // `patient_id` and `phone` queries we also accept prefix/exact matches.
  const trgmMatch = sql`
    (${person_names.given} % ${trimmed})
    or (${person_names.family} % ${trimmed})
    or (${patients.patientId} % ${trimmed})
    or (${person_identifiers.value} % ${trimmed})
  `;

  const prefixMatch =
    classification === "patient_id" || classification === "numeric"
      ? sql`
          or (${patients.patientId} ilike ${trimmed + "%"})
          or (${person_identifiers.value} ilike ${trimmed + "%"})
        `
      : sql``;

  const phoneMatch =
    classification === "phone"
      ? sql`
          or (${person_contacts.value} ilike ${trimmed + "%"})
        `
      : sql``;

  const where = and(
    isNull(patients.deletedAt),
    scope.facilityIdFilter
      ? eq(patients.facilityId, scope.facilityIdFilter)
      : undefined,
    scope.assignedPatientIds
      ? inArray(patients.id, scope.assignedPatientIds)
      : undefined,
    or(sql`(${trgmMatch}${prefixMatch}${phoneMatch})`),
  );

  // ----- Phase 1: surface gender on subtitle; full age/facility name in Ph2 -
  const rows = await db
    .select({
      id: patients.id,
      patientId: patients.patientId,
      facilityId: patients.facilityId,
      given: person_names.given,
      middle: person_names.middle,
      family: person_names.family,
      gender: persons.gender,
      score,
      matchedField,
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
    .leftJoin(person_identifiers, eq(person_identifiers.personId, patients.personId))
    .leftJoin(
      person_contacts,
      and(
        eq(person_contacts.personId, patients.personId),
        eq(person_contacts.isPrimary, true),
      ),
    )
    .where(where)
    .orderBy(sql`${score} desc`, sql`${patients.createdAt} desc`)
    .limit(limit);

  // Dedupe: the identifier/contact LEFT JOINs can fan out a single patient
  // into multiple rows when there are multiple identifiers or contacts.
  // Keep the highest-scoring row per patient id.
  const seen = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const existing = seen.get(row.id);
    if (!existing || Number(row.score) > Number(existing.score)) {
      seen.set(row.id, row);
    }
  }

  const results: PatientHit[] = Array.from(seen.values()).map((row) => {
    const title = [row.given, row.middle, row.family].filter(Boolean).join(" ") ||
      row.patientId;
    const subtitleParts = [row.patientId, row.gender].filter(Boolean);
    return {
      type: "patient",
      id: row.id,
      title,
      subtitle: subtitleParts.join(" · "),
      context: {
        patient_id: row.id,
        facility_id: row.facilityId,
      },
      matched_field: row.matchedField,
      score: Number(row.score),
    };
  });

  return { total: results.length, results };
};
