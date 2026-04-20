import { z } from "zod";
import { ATTACHMENT_SOURCES } from "../../constants/attachment-sources";

const attachmentSourceSchema = z.enum(ATTACHMENT_SOURCES);

export const attachmentGenerateUploadUrlSchema = z.object({
  fileName: z.string().min(1).max(500),
  fileType: z.string().min(1).max(255),
  sourceType: attachmentSourceSchema,
  sourceId: z.uuid(),
  fileSize: z.number().int().positive().optional(),
  /**
   * Required for `Laboratory`, `Radiology`, `StaffIdentity` (no parent row resolver yet).
   * Must equal the authenticated user’s facility. Optional for Visit / FamilyPlanning / Patient
   * when the parent row resolves the facility.
   */
  facilityId: z.uuid().optional(),
});

export type AttachmentGenerateUploadUrlInput = z.infer<
  typeof attachmentGenerateUploadUrlSchema
>;

export const attachmentCreateSchema = z.object({
  name: z.string().min(1).max(500),
  sourceType: attachmentSourceSchema,
  sourceId: z.uuid(),
  fileUrl: z.string().min(1),
  fileSize: z.number().int().nonnegative().optional().nullable(),
  fileType: z.string().min(1).max(255),
  facilityId: z.uuid().optional(),
});

export type AttachmentCreateInput = z.infer<typeof attachmentCreateSchema>;

export const attachmentListQuerySchema = z
  .object({
    sourceType: attachmentSourceSchema,
    sourceId: z.uuid(),
    facilityId: z.uuid().optional(),
  })
  .strict();
