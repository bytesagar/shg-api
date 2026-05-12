import { z } from "zod";
import { clinicalListQuerySchema } from "../../utils/query-parser";

export const treatmentsListQuerySchema = clinicalListQuerySchema;

export type TreatmentsListQuery = z.infer<typeof treatmentsListQuerySchema>;
