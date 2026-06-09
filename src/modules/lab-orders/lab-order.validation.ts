import { z } from "zod";

import {
  createListQuerySchema,
  optionalQueryString,
} from "../../utils/query-parser";

const lowerCasePreprocess = (v: unknown) =>
  typeof v === "string" && v.trim().length > 0
    ? v.trim().toLowerCase()
    : undefined;

const typeQuery = z.preprocess(
  lowerCasePreprocess,
  z.enum(["pathology", "radiology"]).optional(),
);
const statusQuery = z.preprocess(
  lowerCasePreprocess,
  z.enum(["pending", "collected", "completed", "cancelled"]).optional(),
);
const priorityQuery = z.preprocess(
  lowerCasePreprocess,
  z.enum(["routine", "urgent"]).optional(),
);

export const labOrdersListQuerySchema = createListQuerySchema({
  q: optionalQueryString,
  type: typeQuery,
  status: statusQuery,
  priority: priorityQuery,
  patientId: z.uuid().optional(),
});

export type LabOrdersListQuery = z.infer<typeof labOrdersListQuerySchema>;

export const createLabOrderSchema = z
  .object({
    type: z.enum(["pathology", "radiology"]),
    name: z.string().trim().min(1).max(255),
    labTestId: z.uuid().optional().nullable(),
    panel: z.string().trim().max(64).optional().nullable(),
    modality: z.string().trim().max(64).optional().nullable(),
    patientId: z.uuid(),
    visitId: z.uuid().optional().nullable(),
    encounterId: z.uuid().optional().nullable(),
    orderedById: z.uuid().optional().nullable(),
    reason: z.string().trim().max(2000).optional().nullable(),
    priority: z.enum(["routine", "urgent"]).default("routine"),
  })
  .strict();

export type CreateLabOrderInput = z.infer<typeof createLabOrderSchema>;

export const collectSampleSchema = z
  .object({
    specimen: z.string().trim().min(1).max(255),
    collectedByName: z.string().trim().max(255).optional().nullable(),
  })
  .strict();

export type CollectSampleInput = z.infer<typeof collectSampleSchema>;

/** A single analyte row in a pathology result table. */
const pathologyRowSchema = z.object({
  analyte: z.string().trim().min(1),
  value: z.string().trim(),
  unit: z.string().trim().optional().nullable(),
  range: z.string().trim().optional().nullable(),
  flag: z.enum(["high", "low", "normal"]).optional().nullable(),
});

/**
 * Result payload stored verbatim in `lab_orders.result` (JSONB). Pathology
 * uses `rows` + `note`; radiology uses `technique`/`findings`/`impression`.
 * `passthrough` keeps any extra prototype fields rather than dropping them.
 */
export const resultPayloadSchema = z
  .object({
    rows: z.array(pathologyRowSchema).optional(),
    note: z.string().trim().optional().nullable(),
    technique: z.string().trim().optional().nullable(),
    findings: z.string().trim().optional().nullable(),
    impression: z.string().trim().optional().nullable(),
  })
  .passthrough();

export const recordResultSchema = z
  .object({
    result: resultPayloadSchema,
    completedByName: z.string().trim().max(255).optional().nullable(),
  })
  .strict();

export type RecordResultInput = z.infer<typeof recordResultSchema>;

export const uploadResultSchema = z
  .object({
    attachmentId: z.uuid(),
    fileName: z.string().trim().max(500).optional().nullable(),
    completedByName: z.string().trim().max(255).optional().nullable(),
  })
  .strict();

export type UploadResultInput = z.infer<typeof uploadResultSchema>;
