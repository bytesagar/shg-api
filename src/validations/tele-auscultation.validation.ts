import { z } from "zod";
import { createListQuerySchema } from "../utils/query-parser";

export const auscultationStartSchema = z
  .object({
    patientId: z.uuid(),
    encounterId: z.uuid().optional(),
    visitId: z.uuid().optional(),
    appointmentId: z.uuid().optional(),
  })
  .strict();

export type AuscultationStartInput = z.infer<typeof auscultationStartSchema>;

export const auscultationJoinQuerySchema = z
  .object({
    as: z.enum(["doctor", "patient"]),
  })
  .strict();

export type AuscultationJoinQuery = z.infer<typeof auscultationJoinQuerySchema>;

export const auscultationRecordingSchema = z
  .object({
    attachmentId: z.uuid(),
  })
  .strict();

export type AuscultationRecordingInput = z.infer<
  typeof auscultationRecordingSchema
>;

export const auscultationListQuerySchema = createListQuerySchema({
  patientId: z.uuid().optional(),
  encounterId: z.uuid().optional(),
  visitId: z.uuid().optional(),
});

export type AuscultationListQuery = z.infer<typeof auscultationListQuerySchema>;
