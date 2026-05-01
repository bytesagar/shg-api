import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import { FhirSearchRequest } from "./fhir-search.types";

const MAX_FHIR_COUNT = 100;

function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.flatMap((item) => toStringArray(item));
  if (typeof v === "string" && v.trim().length > 0) return [v.trim()];
  return [];
}

export function parseFhirSearchQuery(query: Record<string, unknown>): FhirSearchRequest {
  const rawCount = query._count;
  const rawOffset = query._offset;
  const count = rawCount ? Number(rawCount) : 20;
  const offset = rawOffset ? Number(rawOffset) : 0;

  if (!Number.isFinite(count) || count < 1 || count > MAX_FHIR_COUNT) {
    throw new AppError(
      `Invalid _count. Must be between 1 and ${MAX_FHIR_COUNT}`,
      HTTP_STATUS.BAD_REQUEST,
    );
  }
  if (!Number.isFinite(offset) || offset < 0) {
    throw new AppError("Invalid _offset. Must be >= 0", HTTP_STATUS.BAD_REQUEST);
  }

  const filters: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(query)) {
    if (key === "_count" || key === "_offset") continue;
    const values = toStringArray(value);
    if (values.length) filters[key] = values;
  }

  return {
    count,
    offset,
    filters,
  };
}

export function parseDateFilterToken(token: string): {
  op: "eq" | "gt" | "lt" | "ge" | "le";
  value: Date;
} {
  const normalized = token.trim();
  const prefix = normalized.slice(0, 2);
  const hasPrefix = ["gt", "lt", "ge", "le", "eq"].includes(prefix);
  const op = (hasPrefix ? prefix : "eq") as "eq" | "gt" | "lt" | "ge" | "le";
  const raw = hasPrefix ? normalized.slice(2) : normalized;
  const value = new Date(raw);
  if (Number.isNaN(value.getTime())) {
    throw new AppError(`Invalid date filter '${token}'`, HTTP_STATUS.BAD_REQUEST);
  }

  return { op, value };
}

export function parseTokenFilter(token: string): { system?: string; value: string } {
  const [system, value] = token.split("|");
  if (value !== undefined) {
    return { system: system || undefined, value };
  }
  return { value: token };
}

