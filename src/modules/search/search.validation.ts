import { z } from "zod";

const ENTITY_TYPES = [
  "patient",
  "appointment",
  "practitioner",
  "visit",
  "encounter",
] as const;

/** Comma-separated list of entity types: "patient,appointment". */
const typesParam = z.preprocess((v) => {
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}, z.array(z.enum(ENTITY_TYPES)).optional());

export const searchQuerySchema = z
  .object({
    q: z.string().min(1).max(200),
    types: typesParam,
    limit: z.coerce.number().int().min(1).max(10).default(5),
    /** Admin-only override; non-admin requests have this stripped upstream. */
    facility_id: z.uuid().optional(),
  })
  .strict();

export type SearchQuery = z.infer<typeof searchQuerySchema>;
