import { z } from "zod";

export const districtsQuerySchema = z
  .object({
    provinceId: z.string().optional(),
  })
  .strict();

export const municipalitiesQuerySchema = z
  .object({
    districtId: z.string().optional(),
  })
  .strict();

export type DistrictsQuery = z.infer<typeof districtsQuerySchema>;
export type MunicipalitiesQuery = z.infer<typeof municipalitiesQuerySchema>;
