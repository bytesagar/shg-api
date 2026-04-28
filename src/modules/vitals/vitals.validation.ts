import { z } from "zod";
import { createListQuerySchema } from "../../utils/query-parser";

export const vitalsListQuerySchema = createListQuerySchema({
  patientId: z.uuid(),
});

export type VitalsListQuery = z.infer<typeof vitalsListQuerySchema>;

