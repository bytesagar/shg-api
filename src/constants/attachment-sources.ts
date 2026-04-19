/**
 * Application-level attachment polymorphism: DB stores `varchar` (no Postgres ENUM).
 * Add new values here and redeploy — no DB migration to extend allowed labels.
 */
export const ATTACHMENT_SOURCES = [
  "Visit",
  "FamilyPlanning",
  "Patient",
  "Laboratory",
  "Radiology",
  "StaffIdentity",
] as const;

export type AttachmentSourceType = (typeof ATTACHMENT_SOURCES)[number];

/** Sources we resolve against a real row (facility from parent record). */
export const ATTACHMENT_SOURCES_WITH_DB_PARENT = new Set<AttachmentSourceType>([
  "Visit",
  "FamilyPlanning",
  "Patient",
]);

/** Sources validated only by facility scope until dedicated tables exist. */
export const ATTACHMENT_SOURCES_FACILITY_EXPLICIT_ONLY =
  new Set<AttachmentSourceType>([
    "Laboratory",
    "Radiology",
    "StaffIdentity",
  ]);
