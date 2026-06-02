import type { MigrationReport } from "./report";

/**
 * Explicit value maps from v1 (Prisma `@map`-ed lowercase) enum/text values to
 * v2 pg-enum values. Every map was authored against the *actual* distinct
 * values observed in the restored v1 snapshot (not the Prisma models), so the
 * left-hand sides are exhaustive for this data set. Unknown values are routed
 * to a sensible default AND recorded in the report (`recordUnmappedEnum`) so a
 * human can eyeball anything unexpected after a dry-run.
 */

function lower(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

function mapWith<T extends string>(
  table: Record<string, T>,
  fallback: T,
  where: string,
  raw: unknown,
  report?: MigrationReport,
  treatEmptyAsFallback = true,
): T {
  const key = lower(raw);
  if (key === "" && treatEmptyAsFallback) return fallback;
  const hit = table[key];
  if (hit !== undefined) return hit;
  report?.recordUnmappedEnum(where, String(raw));
  return fallback;
}

// ---- gender: v1 male,female,others -> v2 male,female,other ----
const GENDER: Record<string, "male" | "female" | "other"> = {
  male: "male",
  female: "female",
  others: "other",
  other: "other",
};
export const mapGender = (v: unknown, r?: MigrationReport) =>
  mapWith(GENDER, "other", "gender", v, r);

// ---- caste: v1 dalit,janajati,madhesi,muslim,brahmin,chettri,others ----
const CASTE: Record<
  string,
  "dalit" | "janajati" | "madhesi" | "muslim" | "brahmin_chhetri" | "other"
> = {
  dalit: "dalit",
  janajati: "janajati",
  madhesi: "madhesi",
  muslim: "muslim",
  brahmin: "brahmin_chhetri",
  chettri: "brahmin_chhetri",
  brahmin_chhetri: "brahmin_chhetri",
  others: "other",
  other: "other",
};
export const mapCaste = (v: unknown, r?: MigrationReport) =>
  v == null || lower(v) === ""
    ? null
    : mapWith(CASTE, "other", "caste", v, r, false);

// ---- severity: v1 mild,moderate,severe -> v2 low,medium,high,critical ----
const SEVERITY: Record<string, "low" | "medium" | "high" | "critical"> = {
  mild: "low",
  moderate: "medium",
  severe: "high",
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical",
};
export const mapSeverity = (v: unknown, r?: MigrationReport) =>
  v == null || lower(v) === ""
    ? null
    : mapWith(SEVERITY, "medium", "severity", v, r, false);

// ---- duration_unit: v1 hours,days,weeks,months (subset of v2) ----
const DURATION_UNIT: Record<
  string,
  "hours" | "days" | "weeks" | "months" | "years"
> = {
  hours: "hours",
  days: "days",
  weeks: "weeks",
  months: "months",
  years: "years",
};
export const mapDurationUnit = (v: unknown, r?: MigrationReport) =>
  v == null || lower(v) === ""
    ? null
    : mapWith(DURATION_UNIT, "days", "duration_unit", v, r, false);

// ---- test_category: v1 lab,radiology -> v2 lab,imaging,other ----
const TEST_CATEGORY: Record<string, "lab" | "imaging" | "other"> = {
  lab: "lab",
  radiology: "imaging",
  imaging: "imaging",
  other: "other",
};
export const mapTestCategory = (v: unknown, r?: MigrationReport) =>
  mapWith(TEST_CATEGORY, "other", "test_category", v, r);

// ---- family planning device ----
// v1: depoprovera,sayanapress,implant,pills,iucd,condom,vasectomy,minilap,
//     laparoscopic,none  ->  v2: condom,pills,depo,iucd,implant,vasectomy,
//     minilap,none
const FP_DEVICE: Record<
  string,
  | "condom"
  | "pills"
  | "depo"
  | "iucd"
  | "implant"
  | "vasectomy"
  | "minilap"
  | "none"
> = {
  depoprovera: "depo",
  sayanapress: "depo", // subcutaneous DMPA — same injectable depot class
  depo: "depo",
  implant: "implant",
  pills: "pills",
  iucd: "iucd",
  condom: "condom",
  vasectomy: "vasectomy",
  minilap: "minilap",
  laparoscopic: "minilap", // female sterilization; v2 has no separate code
  none: "none",
};
export const mapFpDevice = (v: unknown, r?: MigrationReport) =>
  v == null || lower(v) === ""
    ? null
    : mapWith(FP_DEVICE, "none", "fp_device", v, r, false);

// ---- family planning service type: v1 add,removal -> v2 new,follow_up,removal ----
const FP_SERVICE_TYPE: Record<string, "new" | "follow_up" | "removal"> = {
  add: "new",
  new: "new",
  follow_up: "follow_up",
  removal: "removal",
};
export const mapFpServiceType = (v: unknown, r?: MigrationReport) =>
  mapWith(FP_SERVICE_TYPE, "new", "fp_service_type", v, r);

// ---- fp usage time period ----
// v1: within_48_hours,48_to_1_year,other -> v2: within_45_days,after_45_days
const FP_USAGE: Record<string, "within_45_days" | "after_45_days"> = {
  within_48_hours: "within_45_days",
  "48_to_1_year": "after_45_days",
  other: "after_45_days",
  within_45_days: "within_45_days",
  after_45_days: "after_45_days",
};
export const mapFpUsageTimePeriod = (v: unknown, r?: MigrationReport) =>
  v == null || lower(v) === ""
    ? null
    : mapWith(FP_USAGE, "after_45_days", "fp_usage_time_period", v, r, false);

// ---- service (patient / visit / encounter): free text varchar in v2 ----
// v1: FAMILYPLANNING,immunization,maternal health,opd  -> canonical underscore
const SERVICE: Record<string, string> = {
  familyplanning: "family_planning",
  family_planning: "family_planning",
  "family-planning": "family_planning",
  immunization: "immunization",
  "maternal health": "maternal_health",
  maternal_health: "maternal_health",
  opd: "opd",
};
export function mapService(v: unknown): string {
  const key = lower(v);
  return SERVICE[key] ?? "opd";
}

// ---- patient status: v1 "Active","Visit completed" -> v2 patientStatusEnum ----
const PATIENT_STATUS: Record<
  string,
  "active" | "inactive" | "deceased" | "discharged" | "referred"
> = {
  active: "active",
  "visit completed": "active",
  inactive: "inactive",
  deceased: "deceased",
  discharged: "discharged",
  referred: "referred",
};
export const mapPatientStatus = (v: unknown, r?: MigrationReport) =>
  mapWith(PATIENT_STATUS, "active", "patient_status", v, r);

// ---- visit/encounter status: v1 "ended"/empty -> v2 visitStatusEnum ----
const VISIT_STATUS: Record<
  string,
  "planned" | "arrived" | "in_progress" | "finished" | "cancelled"
> = {
  ended: "finished",
  finished: "finished",
  completed: "finished",
  "visit completed": "finished",
  "in progress": "in_progress",
  in_progress: "in_progress",
  planned: "planned",
  pending: "planned",
  waiting: "arrived",
  arrived: "arrived",
  cancelled: "cancelled",
  canceled: "cancelled",
};
export const mapVisitStatus = (v: unknown, r?: MigrationReport) =>
  mapWith(VISIT_STATUS, "finished", "visit_status", v, r);

// ---- appointment status: v1 free text -> v2 appointmentStatusEnum ----
const APPOINTMENT_STATUS: Record<
  string,
  "scheduled" | "confirmed" | "cancelled" | "completed" | "no_show"
> = {
  pending: "scheduled",
  scheduled: "scheduled",
  waiting: "scheduled",
  confirmed: "confirmed",
  "in progress": "confirmed",
  "visit completed": "completed",
  completed: "completed",
  cancelled: "cancelled",
  canceled: "cancelled",
  no_show: "no_show",
};
export const mapAppointmentStatus = (v: unknown, r?: MigrationReport) =>
  mapWith(APPOINTMENT_STATUS, "scheduled", "appointment_status", v, r);
