import type { Classification } from "./types";

/**
 * Minimal Phase 1 query classifier per docs/GLOBAL_SEARCH_PLAN.md.
 *
 * Drives column-boost weights and the trigram-vs-prefix decision; does NOT
 * decide which categories run. All five Phase 1 runners always execute.
 *
 *   phone      - 7+ digits  -> exact/prefix match on contact value
 *   patient_id - 2-4 letters + optional dash + 2+ digits, e.g. "PAT-00231"
 *   numeric    - 1-6 digits - ambiguous; runners can decide what to do
 *   name       - anything else -> trigram similarity
 */
export function classifyQuery(q: string): Classification {
  const t = q.trim();
  if (/^\d{7,}$/.test(t)) return "phone";
  if (/^[A-Z]{2,4}-?\d{2,}$/i.test(t)) return "patient_id";
  if (/^\d{1,6}$/.test(t)) return "numeric";
  return "name";
}
