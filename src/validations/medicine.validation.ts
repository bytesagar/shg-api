import { z } from "zod";
import { medicinesListQuerySchema } from "../utils/query-parser";

/** Trimmed optional string; empty -> null so it clears the column on update. */
const optionalText = (max: number) =>
  z.preprocess(
    (v) => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      if (typeof v === "string") {
        const t = v.trim();
        return t.length === 0 ? null : t;
      }
      return v;
    },
    z.string().max(max).nullable().optional(),
  );

export const medicineCreateSchema = z.object({
  medicineName: z
    .string()
    .trim()
    .min(1, "Medicine name is required")
    .max(500),
  medicineForm: optionalText(100),
  strength: optionalText(255),
  unit: optionalText(100),
  dose: optionalText(255),
  frequency: optionalText(100),
  route: optionalText(100),
  medicineTime: optionalText(100),
  isDefault: z.boolean().optional().default(false),
});

export const medicineUpdateSchema = medicineCreateSchema.partial();

export type MedicineCreateInput = z.infer<typeof medicineCreateSchema>;
export type MedicineUpdateInput = z.infer<typeof medicineUpdateSchema>;
export type MedicinesListQuery = z.infer<typeof medicinesListQuerySchema>;
