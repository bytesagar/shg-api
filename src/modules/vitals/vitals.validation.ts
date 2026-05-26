import { z } from "zod";
import { createListQuerySchema } from "../../utils/query-parser";

/**
 * Vitals list query. `visitId` is optional — when present the repository
 * scopes rows to that visit (used by the visit drill-down to show only the
 * vitals recorded in that encounter). Without it the endpoint returns the
 * patient's full vitals history (used by the vitals history tab / snapshots).
 */
export const vitalsListQuerySchema = createListQuerySchema({
  patientId: z.uuid(),
  visitId: z.uuid().optional(),
});

export type VitalsListQuery = z.infer<typeof vitalsListQuerySchema>;
