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

export const usersListQuerySchema = paginationQuerySchema;
