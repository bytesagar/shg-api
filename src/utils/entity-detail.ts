import { and, eq, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { db } from "../db";

/**
 * Picks the "current" row from a child relation per a declared selection rule.
 * Used to flatten a parent + its 1-to-many child tables into a single detail
 * response for the frontend.
 *
 * Why per-child queries (one query per relation, run concurrently) rather
 * than one big lateral join: the relations are bounded per parent (typically
 * <=10 rows), the helper has to be config-driven so a second entity can plug
 * in without writing new SQL, and the picking logic lives in JS as a pure
 * function so each rule is unit-testable without a DB. If a relation grows
 * high-cardinality per parent, swap that one to DISTINCT ON in SQL while
 * leaving the helper interface intact.
 */

export type SelectionRule =
  | { kind: "flagThenRecency"; flagColumn: PgColumn }
  | { kind: "pureRecency" }
  | { kind: "mostRecentPerGroup"; groupColumn: PgColumn };

export interface ChildRelation {
  /** Drizzle table reference. */
  table: PgTable;
  /** FK column on the child that points at the parent (e.g. person_addresses.personId). */
  parentColumn: PgColumn;
  /**
   * Map of camelCase output key -> Drizzle column. Only fields listed here
   * are surfaced in the response. This is the "do not leak internal columns" gate.
   */
  fields: Record<string, PgColumn>;
  /** Selection rule. */
  rule: SelectionRule;
  /**
   * Recency tiebreaker columns, applied in order. Defaults to
   * [updatedAt, createdAt, id] - override when the child table is missing one.
   */
  recencyColumns: PgColumn[];
  /** Output key on the merged parent object. */
  outputKey: string;
}

export type ChildRelationResult<TRow> = TRow | null | Record<string, TRow>;

const INTERNAL_PREFIX = "__entityDetail__";
const FLAG_KEY = `${INTERNAL_PREFIX}flag`;
const GROUP_KEY = `${INTERNAL_PREFIX}group`;
const recencyKey = (i: number) => `${INTERNAL_PREFIX}recency_${i}`;

/**
 * Pure function: given the candidate rows already loaded from the DB and the
 * declared rule, returns the picked row(s).
 *
 * Output:
 *  - flagThenRecency / pureRecency -> the picked row, or null if no rows
 *  - mostRecentPerGroup            -> { [groupValue]: row }, or {} if no rows
 *
 * Rows are expected to carry the internal keys written by `buildProjection`
 * (FLAG_KEY, GROUP_KEY, recencyKey(i)). For unit tests that pass plain rows,
 * use `pickRowFromCandidatesByKeys` below.
 */
export function pickRowFromCandidates<TRow extends Record<string, unknown>>(
  rows: TRow[],
  rule: SelectionRule,
  recencyCount: number,
): ChildRelationResult<TRow> {
  return pickRowFromCandidatesByKeys(rows, {
    kind: rule.kind,
    flagKey: rule.kind === "flagThenRecency" ? FLAG_KEY : undefined,
    groupKey: rule.kind === "mostRecentPerGroup" ? GROUP_KEY : undefined,
    recencyKeys: Array.from({ length: recencyCount }, (_, i) => recencyKey(i)),
  });
}

/**
 * Pure function with explicit string keys, so unit tests can pass plain
 * objects without the internal-prefix dance.
 */
export function pickRowFromCandidatesByKeys<TRow extends Record<string, unknown>>(
  rows: TRow[],
  spec: {
    kind: SelectionRule["kind"];
    flagKey?: string;
    groupKey?: string;
    recencyKeys: string[];
  },
): ChildRelationResult<TRow> {
  const cmp = byRecencyDesc(spec.recencyKeys);

  if (spec.kind === "mostRecentPerGroup") {
    if (!spec.groupKey) throw new Error("mostRecentPerGroup requires groupKey");
    const grouped = new Map<string, TRow[]>();
    for (const row of rows) {
      const raw = row[spec.groupKey];
      if (raw == null) continue;
      const key = String(raw);
      const bucket = grouped.get(key);
      if (bucket) bucket.push(row);
      else grouped.set(key, [row]);
    }
    const out: Record<string, TRow> = {};
    for (const [key, bucket] of grouped) {
      out[key] = [...bucket].sort(cmp)[0]!;
    }
    return out;
  }

  if (rows.length === 0) return null;

  if (spec.kind === "flagThenRecency") {
    if (!spec.flagKey) throw new Error("flagThenRecency requires flagKey");
    const flagged = rows.filter((r) => Boolean(r[spec.flagKey!]));
    const pool = flagged.length > 0 ? flagged : rows;
    return [...pool].sort(cmp)[0] ?? null;
  }

  return [...rows].sort(cmp)[0] ?? null;
}

function byRecencyDesc(keys: string[]) {
  return (a: Record<string, unknown>, b: Record<string, unknown>) => {
    for (const key of keys) {
      const av = a[key];
      const bv = b[key];
      if (av == null && bv == null) continue;
      if (av == null) return 1; // nulls sort last
      if (bv == null) return -1;
      if (av instanceof Date && bv instanceof Date) {
        if (av.getTime() === bv.getTime()) continue;
        return bv.getTime() - av.getTime();
      }
      if (av === bv) continue;
      return av < bv ? 1 : -1;
    }
    return 0;
  };
}

/**
 * Builds the Drizzle projection for one child relation: user-declared output
 * fields plus internal aliases for the columns the rule needs (flag / group /
 * recency tiebreakers). Internal aliases are stripped before returning.
 */
function buildProjection(relation: ChildRelation): Record<string, PgColumn> {
  const projection: Record<string, PgColumn> = { ...relation.fields };
  if (relation.rule.kind === "flagThenRecency") {
    projection[FLAG_KEY] = relation.rule.flagColumn;
  }
  if (relation.rule.kind === "mostRecentPerGroup") {
    projection[GROUP_KEY] = relation.rule.groupColumn;
  }
  relation.recencyColumns.forEach((col, i) => {
    projection[recencyKey(i)] = col;
  });
  return projection;
}

function stripInternal<TOutput extends Record<string, unknown>>(
  row: Record<string, unknown>,
): TOutput {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k.startsWith(INTERNAL_PREFIX)) continue;
    out[k] = v instanceof Date ? v.toISOString() : (v ?? null);
  }
  return out as TOutput;
}

/**
 * Loads rows for one child relation, applies the declared rule, and projects
 * to the configured field set with camelCase keys.
 *
 * Empty-state contract:
 *   - single-row rules (flagThenRecency, pureRecency) -> null when no rows
 *   - mostRecentPerGroup                              -> {} when no rows
 */
export async function selectChildRow<TOutput extends Record<string, unknown>>(
  parentId: string,
  relation: ChildRelation,
  whereExtra?: SQL,
): Promise<ChildRelationResult<TOutput>> {
  const projection = buildProjection(relation);
  const baseWhere = eq(relation.parentColumn, parentId);
  const where = whereExtra ? (and(baseWhere, whereExtra) ?? baseWhere) : baseWhere;

  const rows = (await db
    .select(projection)
    .from(relation.table as any)
    .where(where)) as Array<Record<string, unknown>>;

  const picked = pickRowFromCandidates(rows, relation.rule, relation.recencyColumns.length);

  if (picked === null) return null;

  if (relation.rule.kind === "mostRecentPerGroup") {
    const out: Record<string, TOutput> = {};
    for (const [key, row] of Object.entries(picked as Record<string, Record<string, unknown>>)) {
      out[key] = stripInternal<TOutput>(row);
    }
    return out;
  }

  return stripInternal<TOutput>(picked as Record<string, unknown>);
}

/**
 * Loads all configured child relations for a parent in parallel and merges
 * them into a single object alongside the supplied parent fields.
 *
 * The caller is responsible for fetching the parent first (and applying any
 * tenant scoping there). This helper does no access control.
 */
export async function flattenEntityDetail<TParent extends Record<string, unknown>>(
  parent: TParent,
  parentId: string,
  childRelations: ChildRelation[],
): Promise<TParent & Record<string, unknown>> {
  const childResults = await Promise.all(
    childRelations.map((rel) => selectChildRow(parentId, rel)),
  );

  const merged: Record<string, unknown> = { ...parent };
  childRelations.forEach((rel, i) => {
    const result = childResults[i];
    if (rel.rule.kind === "mostRecentPerGroup") {
      merged[rel.outputKey] = result ?? {};
    } else {
      merged[rel.outputKey] = result ?? null;
    }
  });

  return merged as TParent & Record<string, unknown>;
}

// ----------------------------------------------------------------------------
// Plug-in example for a second entity.
//
// Adding a new entity is just declaring its child relations + calling the
// helper. No new SQL, no new helper code:
//
//   import { user_profiles, user_facility_affiliations } from "../db/schema";
//
//   export const userDetailRelations: ChildRelation[] = [
//     {
//       table: user_profiles,
//       parentColumn: user_profiles.userId,
//       fields: {
//         displayName: user_profiles.displayName,
//         designation: user_profiles.designation,
//       },
//       rule: { kind: "pureRecency" },
//       recencyColumns: [user_profiles.updatedAt, user_profiles.createdAt, user_profiles.id],
//       outputKey: "profile",
//     },
//     {
//       table: user_facility_affiliations,
//       parentColumn: user_facility_affiliations.userId,
//       fields: {
//         facilityId: user_facility_affiliations.facilityId,
//         role: user_facility_affiliations.role,
//       },
//       rule: { kind: "flagThenRecency", flagColumn: user_facility_affiliations.isActive },
//       recencyColumns: [user_facility_affiliations.updatedAt, user_facility_affiliations.createdAt, user_facility_affiliations.id],
//       outputKey: "primaryFacility",
//     },
//   ];
//
//   const detail = await flattenEntityDetail(user, user.id, userDetailRelations);
// ----------------------------------------------------------------------------
