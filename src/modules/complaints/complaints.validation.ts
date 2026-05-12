import { z } from "zod";
import { clinicalListQuerySchema } from "../../utils/query-parser";

export const complaintsListQuerySchema = clinicalListQuerySchema;

export type ComplaintsListQuery = z.infer<typeof complaintsListQuerySchema>;
