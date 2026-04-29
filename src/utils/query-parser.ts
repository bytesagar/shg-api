import { z } from "zod";
import { AppError } from "./app-error";
import { HTTP_STATUS } from "../config/constants";

/** Maximum allowed page size for list endpoints. */
export const MAX_LIST_PAGE_SIZE = 100;

const paginationShape = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_LIST_PAGE_SIZE)
    .default(30),
};

export const paginationQuerySchema = z.object(paginationShape).strict();

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Optional non-empty string from query (ignores arrays and empty strings). */
export const optionalQueryString = z.preprocess((v) => {
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  return undefined;
}, z.string().optional());

/**
 * Builds a strict Zod schema for list endpoints: pagination plus resource filters.
 * Unknown query keys are rejected.
 */
export function createListQuerySchema<T extends z.ZodRawShape>(
  filterShape: T,
) {
  return z
    .object({
      ...paginationShape,
      ...filterShape,
    })
    .strict();
}

export function parseListQuery<T extends z.ZodTypeAny>(
  query: unknown,
  schema: T,
): z.infer<T> {
  const result = schema.safeParse(query);
  if (!result.success) {
    const errorMessages = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    throw new AppError(
      `Query validation failed: ${errorMessages}`,
      HTTP_STATUS.BAD_REQUEST,
    );
  }
  return result.data;
}

export const patientsListQuerySchema = createListQuerySchema({
  searchString: optionalQueryString,
  service: optionalQueryString,
});

export const healthFacilitiesListQuerySchema = createListQuerySchema({
  searchString: optionalQueryString,
  municipalityId: optionalQueryString,
});

export const logsListQuerySchema = paginationQuerySchema;

const usersUserTypeQuery = z.preprocess(
  (v) => {
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
    return undefined;
  },
  z.enum(["admin", "user", "facility", "doctor", "fchv"]).optional(),
);

export const usersListQuerySchema = createListQuerySchema({
  role: optionalQueryString,
  userType: usersUserTypeQuery,
  searchString: optionalQueryString,
});

const isoDateParam = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

/** When both omitted, roster list returns all rows (still paginated). */
export const rosterListQuerySchema = createListQuerySchema({
  fromDate: isoDateParam.optional(),
  toDate: isoDateParam.optional(),
  userId: z.uuid().optional(),
  service: optionalQueryString,
});

export const rosterAvailableUsersQuerySchema = z
  .object({
    date: isoDateParam,
    service: optionalQueryString,
    atTime: optionalQueryString,
  })
  .strict();

/** Pagination only — users eligible for the roster "User" dropdown (facility staff, excludes admins). */
export const rosterAssignableUsersQuerySchema = paginationQuerySchema;

/** Optional search string for ICD-11 list; trimmed, max 100 chars; empty/absent = list all. */
const icd11CodesSearchQ = z.preprocess((v) => {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (t.length === 0) return undefined;
  return t.slice(0, 100);
}, z.string().max(100).optional());

export const icd11CodesListQuerySchema = createListQuerySchema({
  q: icd11CodesSearchQ,
  category: optionalQueryString,
});
