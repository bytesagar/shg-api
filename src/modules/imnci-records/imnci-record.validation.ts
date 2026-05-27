import { z } from "zod";

import {
  createListQuerySchema,
  optionalQueryString,
} from "@/utils/query-parser";

const optionalAgeBandQuery = z.preprocess((v) => {
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  return undefined;
}, z.enum(["under-2-months", "2-months-to-5-years"]).optional());

/**
 * Age bands the frontend dispatches by. Kept as a literal union so the
 * backend can validate without coupling to the wider HMIS enums. Add a
 * new band here when the frontend introduces one.
 */
export const imnciRecordAgeBandSchema = z.enum([
  "under-2-months",
  "2-months-to-5-years",
]);

export type ImnciRecordAgeBand = z.infer<typeof imnciRecordAgeBandSchema>;

/**
 * Upsert payload. `id` is the client-generated UUID from the Dexie
 * outbox so a re-sync of the same record (after a clinician edit, or
 * after a network retry) idempotently overwrites the row.
 *
 * `values` stays a permissive `record(string, any)` — the per-band
 * form shape is owned by the frontend; the backend just archives the
 * JSON blob. Tightening this would couple every form field change to
 * a backend deploy.
 */
export const imnciRecordUpsertSchema = z
  .object({
    id: z.uuid(),
    patientId: z.uuid(),
    visitId: z.uuid().nullable().optional(),
    encounterId: z.uuid().nullable().optional(),
    ageBand: imnciRecordAgeBandSchema,
    values: z.record(z.string(), z.any()),
    clientCreatedAt: z.iso.datetime(),
    clientUpdatedAt: z.iso.datetime(),
  })
  .strict();

export type ImnciRecordUpsertInput = z.infer<typeof imnciRecordUpsertSchema>;

export const imnciRecordsListQuerySchema = createListQuerySchema({
  patientId: optionalQueryString,
  ageBand: optionalAgeBandQuery,
});
