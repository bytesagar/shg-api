import { z } from "zod";
import { clinicalListQuerySchema } from "../../utils/query-parser";

export const historiesListQuerySchema = clinicalListQuerySchema;

export type HistoriesListQuery = z.infer<typeof historiesListQuerySchema>;
