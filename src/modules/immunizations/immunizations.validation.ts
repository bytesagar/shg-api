import { z } from "zod";
import {
  isoDateString,
  optionalIsoDateString,
} from "../../validations/common.validation";

export const childImmunizationUpsertSchema = z
  .object({
    mothersName: z.string().min(1).max(255),
    fathersName: z.string().min(1).max(255),
    weightAtBirth: z.number().positive().optional().nullable(),
  })
  .strict();

export type ChildImmunizationUpsertInput = z.infer<
  typeof childImmunizationUpsertSchema
>;

export const immunizationHistoryCreateSchema = z
  .object({
    vaccineName: z.string().min(1).max(255),
    date: isoDateString,
    vaccinated: z.boolean(),
    vaccinatedDate: optionalIsoDateString,
    aefi: z.string().optional().nullable(),
  })
  .strict();

export type ImmunizationHistoryCreateInput = z.infer<
  typeof immunizationHistoryCreateSchema
>;
