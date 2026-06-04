import { z } from "zod";

/**
 * Parse a `YYYY-MM-DD` calendar date into a UTC `Date` pinned to that day's
 * midnight. The service layer treats `toDate` as the inclusive last day and
 * snaps it to the next midnight before querying — see
 * `analytics.service.ts#endOfDayExclusiveUtc`.
 */
export const isoDateInputSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
  .transform((s) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  })
  .refine((d) => !Number.isNaN(d.getTime()), "Invalid date");

export const facilityIdParamSchema = z
  .union([z.literal("all"), z.string().uuid("Must be a UUID or 'all'")])
  .optional();

/**
 * Geography narrowing params (admin-only). Each is an optional facility-table
 * UUID; the service resolves the narrowest provided level to a set of facility
 * IDs. Empty strings are coerced to `undefined` so a blank query param is a
 * no-op rather than a validation error.
 */
const optionalUuidParam = z
  .string()
  .trim()
  .min(1)
  .uuid("Must be a UUID")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const geographyScopeParamsSchema = z.object({
  provinceId: optionalUuidParam,
  districtId: optionalUuidParam,
  municipalityId: optionalUuidParam,
});

export const dateRangeSchema = z
  .object({
    fromDate: isoDateInputSchema,
    toDate: isoDateInputSchema,
  })
  .superRefine((v, ctx) => {
    // Skip when an inner schema already failed — `v.fromDate`/`v.toDate` may
    // not be Dates in that case, and we don't want to layer a misleading
    // "fromDate must be <= toDate" error on top of a regex failure.
    if (!(v.fromDate instanceof Date) || !(v.toDate instanceof Date)) return;
    if (v.fromDate.getTime() > v.toDate.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "fromDate must be <= toDate",
        path: ["fromDate"],
      });
    }
  });

export const limitSchema = z
  .string()
  .regex(/^\d+$/)
  .transform((s) => Number(s))
  .pipe(z.number().int().min(1).max(100))
  .optional();

export const topDiseasesSchema = dateRangeSchema.and(
  z.object({ limit: limitSchema }),
);

export const morbidityTrendSchema = dateRangeSchema.and(
  z.object({ limit: limitSchema }),
);

export type DateRangeInput = z.infer<typeof dateRangeSchema>;
export type TopDiseasesInput = z.infer<typeof topDiseasesSchema>;
export type MorbidityTrendInput = z.infer<typeof morbidityTrendSchema>;
