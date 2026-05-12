import { z } from "zod";
import { clinicalListQuerySchema } from "../../utils/query-parser";

export const physicalExaminationsListQuerySchema = clinicalListQuerySchema;

export type PhysicalExaminationsListQuery = z.infer<
  typeof physicalExaminationsListQuerySchema
>;
