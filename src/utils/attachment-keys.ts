import { randomUUID } from "crypto";

const UUID_RE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** Safe extension from original filename: lowercase, alnum only, max 10 chars. */
export function safeFileExtension(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() ?? "";
  const lastDot = base.lastIndexOf(".");
  if (lastDot < 0 || lastDot === base.length - 1) return "";
  let ext = base.slice(lastDot + 1).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (ext.length > 10) ext = ext.slice(0, 10);
  return ext ? `.${ext}` : "";
}

/**
 * Server-owned object key: facilities/{facilityId}/attachments/{uuid}{ext}
 */
export function buildAttachmentObjectKey(
  facilityId: string,
  extWithDot: string,
): string {
  const id = randomUUID();
  const suffix = extWithDot || "";
  return `facilities/${facilityId}/attachments/${id}${suffix}`;
}

/**
 * Validates that `key` is exactly one of our attachment keys for this facility.
 */
export function isAttachmentKeyForFacility(key: string, facilityId: string): boolean {
  const pattern = new RegExp(
    `^facilities/${facilityId}/attachments/${UUID_RE}(\\.[a-z0-9]{1,10})?$`,
    "i",
  );
  return pattern.test(key) && !key.includes("..");
}

/**
 * Server-owned object key for a user's own avatar: users/{userId}/avatar/{uuid}{ext}.
 * Kept under a per-user prefix (not the facility attachments tree) so avatars are
 * self-service for any authenticated user, regardless of facility/clinical role.
 */
export function buildUserAvatarObjectKey(
  userId: string,
  extWithDot: string,
): string {
  const id = randomUUID();
  const suffix = extWithDot || "";
  return `users/${userId}/avatar/${id}${suffix}`;
}

/** Validates that `key` is one of this user's own avatar keys. */
export function isAvatarKeyForUser(key: string, userId: string): boolean {
  const pattern = new RegExp(
    `^users/${userId}/avatar/${UUID_RE}(\\.[a-z0-9]{1,10})?$`,
    "i",
  );
  return pattern.test(key) && !key.includes("..");
}
