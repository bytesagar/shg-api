// Barrel for the database schema, split by domain.
// Re-exports every table, enum, and relation so existing
// `import { ... } from "@/db/schema"` call sites keep working unchanged.

export * from "./enums";
export * from "./system";
export * from "./geography";
export * from "./facilities";
export * from "./auth";
export * from "./person";
export * from "./patient";
export * from "./practitioner";
export * from "./clinical";
export * from "./maternal-health";
export * from "./immunization";
export * from "./family-planning";
export * from "./appointments";
export * from "./sms";
export * from "./imnci";
