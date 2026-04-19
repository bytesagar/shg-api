/** UTC calendar helpers for roster day + time windows (matches stored roster.date as UTC midnight). */

export function utcMidnightForCalendarDay(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) throw new Error("Invalid date");
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

/** UTC midnight and next midnight for the calendar day of `instant` (UTC). */
export function utcDayBoundsFromInstant(instant: Date): {
  dayStart: Date;
  nextDayStart: Date;
} {
  const y = instant.getUTCFullYear();
  const m = instant.getUTCMonth();
  const d = instant.getUTCDate();
  const dayStart = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
  const nextDayStart = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return { dayStart, nextDayStart };
}

export function endOfUtcCalendarDay(isoDate: string): Date {
  const start = utcMidnightForCalendarDay(isoDate);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/** Minutes since midnight UTC for a Date. */
export function minutesSinceUtcMidnight(d: Date): number {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** Parse "HH:mm" or "HH:mm:ss" to minutes from midnight; null if invalid. */
export function parseTimeToMinutes(s: string): number | null {
  const t = s.trim();
  const m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh > 23 || mm > 59) return null;
  return hh * 60 + mm;
}

export function isTimeWithinWindow(
  scheduledMinutes: number,
  fromTime: string,
  toTime: string,
): boolean {
  const fromM = parseTimeToMinutes(fromTime);
  const toM = parseTimeToMinutes(toTime);
  if (fromM === null || toM === null) return false;
  if (toM >= fromM) {
    return scheduledMinutes >= fromM && scheduledMinutes <= toM;
  }
  // overnight window e.g. 22:00–06:00
  return scheduledMinutes >= fromM || scheduledMinutes <= toM;
}

/**
 * Whether two same-calendar-day windows overlap (closed intervals on the same day).
 * Overnight windows are skipped (returns false) so we do not block inserts on ambiguous overlap.
 */
export function rosterSameDayWindowsOverlap(
  fromTimeA: string,
  toTimeA: string,
  fromTimeB: string,
  toTimeB: string,
): boolean {
  const fa = parseTimeToMinutes(fromTimeA);
  const ta = parseTimeToMinutes(toTimeA);
  const fb = parseTimeToMinutes(fromTimeB);
  const tb = parseTimeToMinutes(toTimeB);
  if (fa === null || ta === null || fb === null || tb === null) return false;
  if (ta < fa || tb < fb) return false;
  return fa < tb && fb < ta;
}
