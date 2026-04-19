const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;
const DEFAULT_ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export function getAttachmentMaxBytes(): number {
  const raw = process.env.ATTACHMENT_MAX_BYTES;
  if (!raw) return DEFAULT_MAX_BYTES;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_BYTES;
}

export function getAttachmentAllowedContentTypes(): Set<string> {
  const raw = process.env.ATTACHMENT_ALLOWED_CONTENT_TYPES;
  const list = raw
    ? raw.split(",").map((s) => s.trim().toLowerCase())
    : DEFAULT_ALLOWED_TYPES;
  return new Set(list);
}

export function getS3AttachmentsBucket(): string | undefined {
  const b = process.env.S3_ATTACHMENTS_BUCKET;
  return b?.trim() || undefined;
}
