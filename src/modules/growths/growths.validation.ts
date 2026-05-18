import { z } from "zod";
import { createListQuerySchema } from "../../utils/query-parser";
import { isoDateString } from "../../validations/common.validation";

const growthMeasurement = z.number().positive().finite();

export const growthCreateSchema = z
  .object({
    date: isoDateString,
    weight: growthMeasurement.optional().nullable(),
    height: growthMeasurement.optional().nullable(),
    muac: growthMeasurement.optional().nullable(),
  })
  .strict()
  .refine(
    (v) => v.weight != null || v.height != null || v.muac != null,
    "At least one of weight, height, or muac must be provided",
  );

export type GrowthCreateInput = z.infer<typeof growthCreateSchema>;

export const growthUpdateSchema = z
  .object({
    date: isoDateString.optional(),
    weight: growthMeasurement.optional().nullable(),
    height: growthMeasurement.optional().nullable(),
    muac: growthMeasurement.optional().nullable(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, "No fields to update");

export type GrowthUpdateInput = z.infer<typeof growthUpdateSchema>;

export const growthListQuerySchema = createListQuerySchema({
  patientId: z.uuid(),
});

export type GrowthListQuery = z.infer<typeof growthListQuerySchema>;
