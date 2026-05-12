import { z } from "zod";
import { clinicalListQuerySchema } from "../../utils/query-parser";

export const medicationsListQuerySchema = clinicalListQuerySchema;

export type MedicationsListQuery = z.infer<typeof medicationsListQuerySchema>;
