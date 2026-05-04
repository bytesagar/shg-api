import { z } from "zod";

export const districtsQuerySchema = z
  .object({
    provinceCode: z.coerce.number().int().positive().optional(),
  })
  .strict();

export const municipalitiesQuerySchema = z
  .object({
    districtCode: z.coerce.number().int().positive().optional(),
  })
  .strict();

export type DistrictsQuery = z.infer<typeof districtsQuerySchema>;
export type MunicipalitiesQuery = z.infer<typeof municipalitiesQuerySchema>;
