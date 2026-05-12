import { and, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "../../../db";
import {
  persons,
  practitioner_role_assignments,
  practitioners,
  users,
} from "../../../db/schema";
import type { PractitionerHit } from "../types";
import type { SearchRunner } from "./runner-types";

/**
 * Practitioner search runner. Matches against:
 *   - users.first_name / last_name (trigram)
 *   - users.specialization (cheap exact/prefix)
 *
 * Scope rules:
 *   - admin   : all practitioners
 *   - facility/doctor/nurse/etc : practitioners active at the user's facility
 *                                 via practitioner_role_assignments
 *   - fchv    : same as facility (practitioner directory is staff-facing
 *               but FCHV may need to reach the linked nurse/doctor)
 *   - user    : not returned (self-only roles get zero results)
 */
export const searchPractitioners: SearchRunner<PractitionerHit> = async ({
  scope,
  q,
  limit,
}) => {
  if (scope.ownAppointmentsOnlyForUserId) {
    return { total: 0, results: [] };
  }

  const trimmed = q.trim();
  if (trimmed.length === 0) return { total: 0, results: [] };

  const firstSim = sql<number>`coalesce(similarity(${users.firstName}, ${trimmed}), 0)`;
  const lastSim = sql<number>`coalesce(similarity(${users.lastName}, ${trimmed}), 0)`;
  const specializationSim = sql<number>`coalesce(similarity(${users.specialization}, ${trimmed}), 0)`;

  const score = sql<number>`greatest(${firstSim}, ${lastSim}, ${specializationSim})`;

  const matchedField = sql<string>`
    case
      when ${firstSim} >= ${lastSim} and ${firstSim} >= ${specializationSim}
        then 'first_name'
      when ${lastSim} >= ${specializationSim}
        then 'last_name'
      else 'specialization'
    end
  `;

  // Facility scope rides on practitioner_role_assignments. For admin we
  // don't join the assignments table - we just LEFT JOIN to report any
  // facility we find on the assignments row (best-effort context.facility_id).
  const where = and(
    isNull(users.deletedAt),
    eq(practitioners.active, true),
    scope.facilityIdFilter
      ? eq(practitioner_role_assignments.facilityId, scope.facilityIdFilter)
      : undefined,
    scope.facilityIdFilter
      ? eq(practitioner_role_assignments.active, true)
      : undefined,
    or(
      sql`(${users.firstName} % ${trimmed})`,
      sql`(${users.lastName} % ${trimmed})`,
      sql`(coalesce(${users.specialization}, '') % ${trimmed})`,
    ),
  );

  const rows = await db
    .select({
      practitionerId: practitioners.id,
      userId: practitioners.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      specialization: users.specialization,
      designation: users.designation,
      facilityId: practitioner_role_assignments.facilityId,
      score,
      matchedField,
    })
    .from(practitioners)
    .innerJoin(persons, eq(persons.id, practitioners.personId))
    .leftJoin(users, eq(users.id, practitioners.userId))
    [scope.facilityIdFilter ? "innerJoin" : "leftJoin"](
      practitioner_role_assignments,
      eq(practitioner_role_assignments.practitionerId, practitioners.id),
    )
    .where(where)
    .orderBy(sql`${score} desc`)
    .limit(limit);

  // Same dedupe as patients: a practitioner with multiple role assignments
  // can produce multiple rows. Keep highest-scoring per practitioner.
  const seen = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const existing = seen.get(row.practitionerId);
    if (!existing || Number(row.score) > Number(existing.score)) {
      seen.set(row.practitionerId, row);
    }
  }

  const results: PractitionerHit[] = Array.from(seen.values()).map((row) => {
    const fullName = [row.firstName, row.lastName].filter(Boolean).join(" ") || "Practitioner";
    const subtitleParts = [row.designation, row.specialization].filter(Boolean);
    const context: PractitionerHit["context"] = {
      practitioner_id: row.practitionerId,
    };
    if (row.userId) context.user_id = row.userId;
    if (row.facilityId) context.facility_id = row.facilityId;
    return {
      type: "practitioner",
      id: row.practitionerId,
      title: fullName,
      subtitle: subtitleParts.join(" · "),
      context,
      matched_field: row.matchedField,
      score: Number(row.score),
    };
  });

  return { total: results.length, results };
};
