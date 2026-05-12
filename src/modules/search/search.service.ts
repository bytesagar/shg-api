import { db } from "../../db";
import { sql } from "drizzle-orm";
import { classifyQuery } from "./classify";
import { buildSearchScope } from "./search.scope";
import { searchAppointments } from "./runners/appointments.runner";
import { searchEncounters } from "./runners/encounters.runner";
import { searchPatients } from "./runners/patients.runner";
import { searchPractitioners } from "./runners/practitioners.runner";
import { searchVisits } from "./runners/visits.runner";
import type {
  EntityType,
  ScopeContext,
  SearchCategory,
  SearchResponse,
} from "./types";
import type { SearchRunner } from "./runners/runner-types";

/** Per-category statement timeout (plan: 500ms). */
const PER_CATEGORY_TIMEOUT_MS = 500;
/** Overall request budget (plan: 1.5s hard cap). */
const OVERALL_BUDGET_MS = 1500;

/** Maps `type` discriminator -> { runner, label }. Order is response order. */
const RUNNERS: Array<{
  type: EntityType;
  label: string;
  runner: SearchRunner;
}> = [
  { type: "patient", label: "Patients", runner: searchPatients as SearchRunner },
  { type: "appointment", label: "Appointments", runner: searchAppointments as SearchRunner },
  { type: "practitioner", label: "Practitioners", runner: searchPractitioners as SearchRunner },
  { type: "visit", label: "Visits", runner: searchVisits as SearchRunner },
  { type: "encounter", label: "Encounters", runner: searchEncounters as SearchRunner },
];

export interface SearchAllOptions {
  /** Per-category cap. Plan default 5, max 10. */
  limit: number;
  /** When omitted, all Phase 1 runners run. */
  types?: EntityType[];
  /** Admin only - silently ignored when role !== admin (filtered upstream). */
  adminFacilityOverride?: string | null;
}

/**
 * Orchestrates Phase 1 search. Fans out the requested runners, applies a
 * per-category 500ms statement_timeout and an overall 1.5s budget; any
 * runner that times out or errors comes back as `{ partial: true, results: [] }`
 * and the top-level response sets `partial: true`.
 */
export async function searchAll(
  ctx: ScopeContext,
  q: string,
  opts: SearchAllOptions,
): Promise<SearchResponse> {
  const startedAt = Date.now();
  const classification = classifyQuery(q);
  const scope = await buildSearchScope(ctx, opts.adminFacilityOverride ?? null);

  const selected = opts.types
    ? RUNNERS.filter((r) => opts.types!.includes(r.type))
    : RUNNERS;

  // Wrap each runner in a transaction that sets a 500ms statement_timeout.
  // The plan's `SET LOCAL statement_timeout` only works inside a transaction;
  // outside one, postgres ignores it. Each runner gets its own tx so
  // timeouts don't cascade across categories.
  const runWithTimeout = (r: (typeof RUNNERS)[number]) =>
    db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL statement_timeout = ${PER_CATEGORY_TIMEOUT_MS}`));
      return r.runner({ scope, q, classification, limit: opts.limit });
    });

  // Overall budget: race the fan-out against a single timeout. If the
  // budget fires first, mark any unresolved runners as partial.
  const overallTimeout = new Promise<typeof TIMED_OUT>((resolve) => {
    setTimeout(() => resolve(TIMED_OUT), OVERALL_BUDGET_MS);
  });

  const settledOrTimeout = await Promise.race([
    Promise.allSettled(selected.map(runWithTimeout)),
    overallTimeout,
  ]);

  const categories: SearchCategory[] = [];
  let anyPartial = false;

  if (settledOrTimeout === TIMED_OUT) {
    // Overall budget blown before anything settled. Every category partial.
    anyPartial = true;
    for (const r of selected) {
      categories.push({ type: r.type, label: r.label, total: 0, partial: true, results: [] });
    }
  } else {
    const settled = settledOrTimeout;
    settled.forEach((res, i) => {
      const r = selected[i]!;
      if (res.status === "fulfilled") {
        categories.push({
          type: r.type,
          label: r.label,
          total: res.value.total,
          partial: false,
          results: res.value.results,
        });
      } else {
        // statement_timeout shows up as a pg error here, same envelope as
        // any other runner failure.
        anyPartial = true;
        categories.push({
          type: r.type,
          label: r.label,
          total: 0,
          partial: true,
          results: [],
        });
      }
    });
  }

  return {
    query: q,
    classification,
    took_ms: Date.now() - startedAt,
    partial: anyPartial,
    categories,
  };
}

const TIMED_OUT = Symbol("timed_out");
