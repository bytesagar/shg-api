import { z } from "zod";
import { clinicalListQuerySchema } from "../../utils/query-parser";

export const confirmDiagnosesListQuerySchema = clinicalListQuerySchema;

export type ConfirmDiagnosesListQuery = z.infer<typeof confirmDiagnosesListQuerySchema>;
