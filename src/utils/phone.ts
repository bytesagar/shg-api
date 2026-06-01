/**
 * Normalize a Nepali mobile number to canonical E.164 form (+977XXXXXXXXXX).
 *
 * Accepts a bare 10-digit mobile ("9841234567"), an already-prefixed number
 * ("977…" / "+977…"), numbers with spaces/dashes/parens, and a national-trunk
 * leading zero ("0984…"). Returns `null` when the input is not a valid Nepali
 * mobile (10 digits beginning with 9).
 *
 * This centralizes the `+977` prefixing the v1 webapp did ad-hoc at each call
 * site, so every SMS recipient is formatted identically before dispatch.
 */
export function normalizeNepaliPhone(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;

  let digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;

  // Strip the country code only when there are extra digits beyond a bare
  // 10-digit number, so a legitimate 10-digit mobile is never truncated.
  if (digits.length > 10 && digits.startsWith("977")) {
    digits = digits.slice(3);
  }

  // Drop a national-trunk leading zero (e.g. "0984…").
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // Valid Nepali mobile numbers are 10 digits and begin with 9.
  if (digits.length !== 10 || !digits.startsWith("9")) {
    return null;
  }

  return `+977${digits}`;
}
