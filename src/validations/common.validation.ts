import { z } from "zod";

export const isoDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be yyyy-mm-dd");

export const optionalIsoDateString = isoDateString.optional().nullable();
