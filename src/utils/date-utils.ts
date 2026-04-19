/**
 * UTC calendar-day helpers. Use for half-open ranges [start, endExclusive) in queries.
 */

/**
 * UTC midnight and the first instant of the following UTC day for `d`'s calendar day.
 * Matches semantics of `utcDayBoundsFromInstant` in roster-time (dayStart / nextDayStart).
 */
export function utcDayBounds(d: Date): { start: Date; endExclusive: Date } {
  const start = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
  );
  const endExclusive = new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    ),
  );
  return { start, endExclusive };
}
