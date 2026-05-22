/**
 * Application-level attachment type tag (stored in `attachments.category`).
 * Orthogonal to `sourceType` (which scopes the file to a patient/visit/etc).
 * `lab` / `imaging` / `other` mirror test categories; `document` is the
 * default for general patient uploads.
 */
export const ATTACHMENT_CATEGORIES = [
  "lab",
  "imaging",
  "other",
  "document",
] as const;

export type AttachmentCategory = (typeof ATTACHMENT_CATEGORIES)[number];
