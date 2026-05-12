import { z } from "zod";
import { clinicalListQuerySchema } from "../../utils/query-parser";

export const provisionalDiagnosesListQuerySchema = clinicalListQuerySchema;

export type ProvisionalDiagnosesListQuery = z.infer<typeof provisionalDiagnosesListQuerySchema>;
