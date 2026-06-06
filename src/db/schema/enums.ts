import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role_enum", [
  "admin",
  "user",
  "facility",
  "doctor",
  "fchv",
]);

export const logLevelEnum = pgEnum("log_level_enum", [
  "info",
  "warn",
  "error",
  "debug",
]);

export const genderEnum = pgEnum("gender_enum", ["male", "female", "other"]);

export const bloodGroupEnum = pgEnum("blood_group_enum", [
  "unknown",
  "a_positive",
  "a_negative",
  "b_positive",
  "b_negative",
  "ab_positive",
  "ab_negative",
  "o_positive",
  "o_negative",
]);

export const casteEnum = pgEnum("caste_enum", [
  "dalit",
  "janajati",
  "madhesi",
  "muslim",
  "brahmin_chhetri",
  "other",
]);

export const ageUnitEnum = pgEnum("age_unit_enum", ["years", "months", "days"]);

export const severityEnum = pgEnum("severity_enum", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const durationUnitEnum = pgEnum("duration_unit_enum", [
  "hours",
  "days",
  "weeks",
  "months",
  "years",
]);

export const testCategoryEnum = pgEnum("test_category_enum", [
  "lab",
  "imaging",
  "other",
]);

export const familyPlanningServiceTypeEnum = pgEnum(
  "family_planning_service_type_enum",
  ["new", "follow_up", "removal"],
);

export const familyPlanningDeviceEnum = pgEnum("family_planning_device_enum", [
  "condom",
  "pills",
  "depo",
  "iucd",
  "implant",
  "vasectomy",
  "minilap",
  "none",
]);

export const fpUsageTimePeriodEnum = pgEnum("fp_usage_time_period_enum", [
  "within_45_days",
  "after_45_days",
]);

export const patientStatusEnum = pgEnum("patient_status_enum", [
  "active",
  "inactive",
  "deceased",
  "discharged",
  "referred",
]);

export const visitStatusEnum = pgEnum("visit_status_enum", [
  "planned",
  "arrived",
  "in_progress",
  "finished",
  "cancelled",
]);

export const rosterStatusEnum = pgEnum("roster_status_enum", [
  "active",
  "inactive",
]);

export const pregnancyStatusEnum = pgEnum("pregnancy_status_enum", [
  "active",
  "ended",
]);

// ---- HMIS 2082 maternal-health enums ----

export const hmisEthnicCodeEnum = pgEnum("hmis_ethnic_code_enum", [
  "01_dalit",
  "02_janajati",
  "03_madhesi",
  "04_muslim",
  "05_brahmin_chhetri",
  "06_other",
]);

export const ecologicalZoneEnum = pgEnum("ecological_zone_enum", [
  "mountain",
  "hill",
  "terai",
]);

export const ancProtocolVisitEnum = pgEnum("anc_protocol_visit_enum", [
  "ANC1",
  "ANC2",
  "ANC3",
  "ANC4",
  "ANC5",
  "ANC6",
  "ANC7",
  "ANC8",
]);

export const pncProtocolVisitEnum = pgEnum("pnc_protocol_visit_enum", [
  "PNC1",
  "PNC2",
  "PNC3",
  "PNC4",
]);

export const laborTypeEnum = pgEnum("labor_type_enum", [
  "spontaneous",
  "augmented",
  "induced",
]);

export const deliveryModeEnum = pgEnum("delivery_mode_enum", [
  "spontaneous",
  "vacuum",
  "forceps",
  "cs",
]);

export const fetalPresentationEnum = pgEnum("fetal_presentation_enum", [
  "cephalic",
  "breech",
  "shoulder",
]);

export const birthAttendantEnum = pgEnum("birth_attendant_enum", [
  "sba_anm",
  "shp",
  "other",
]);

export const neonatalStatusEnum = pgEnum("neonatal_status_enum", [
  "normal",
  "infection",
  "asphyxia",
  "hypothermia",
  "jaundice",
  "congenital_syphilis",
]);

export const maternalOutcomeEnum = pgEnum("maternal_outcome_enum", [
  "recovered",
  "stable",
  "referred",
  "lama",
  "absconded",
  "died",
]);

export const testResultEnum = pgEnum("test_result_enum", [
  "reactive",
  "non_reactive",
  "positive",
  "negative",
  "pending",
]);

export const complicationStageEnum = pgEnum("complication_stage_enum", [
  "anc",
  "delivery",
  "pnc",
  "abortion",
]);

export const complicationManagementEnum = pgEnum(
  "complication_management_enum",
  ["treated", "referred"],
);

export const abortionProcedureEnum = pgEnum("abortion_procedure_enum", [
  "mva",
  "eva",
  "medication",
  "manual_induction",
  "d_and_e",
  "misoprostol",
]);

export const pacIndicationEnum = pgEnum("pac_indication_enum", [
  "incomplete_induced",
  "incomplete_spontaneous",
  "septic",
  "other",
]);

export const maternalDeathStageEnum = pgEnum("maternal_death_stage_enum", [
  "pregnant",
  "delivery",
  "postnatal_42d",
]);

export const deliveryPlaceEnum = pgEnum("delivery_place_enum", [
  "home",
  "this_facility",
  "other_facility",
  "enroute",
]);

export const familyPlanningPostpartumTypeEnum = pgEnum(
  "family_planning_postpartum_type_enum",
  ["iucd", "implant", "btl", "depo", "none"],
);

// ---- HMIS 2082 child immunization enums ----

export const vaccineRouteEnum = pgEnum("vaccine_route_enum", [
  "im",
  "sc",
  "id",
  "po",
  "nasal",
  "other",
]);

export const vaccineSiteEnum = pgEnum("vaccine_site_enum", [
  "left_arm",
  "right_arm",
  "left_thigh",
  "right_thigh",
  "oral",
  "other",
]);

export const immunizationModeEnum = pgEnum("immunization_mode_enum", [
  "routine",
  "campaign",
  "school",
  "catch_up",
  "outbreak_response",
]);

export const aefiSeverityEnum = pgEnum("aefi_severity_enum", [
  "mild",
  "severe",
]);

export const aefiOutcomeEnum = pgEnum("aefi_outcome_enum", [
  "recovered",
  "recovering",
  "referred",
  "died",
  "unknown",
]);

export const vaccineCategoryEnum = pgEnum("vaccine_category_enum", [
  "vaccine",
  "nutrition",
]);

export const appointmentStatusEnum = pgEnum("appointment_status_enum", [
  "scheduled",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
]);

export const callRequestStatusEnum = pgEnum("call_request_status_enum", [
  "pending",
  "accepted",
  "declined",
  "completed",
]);

export const personStatusEnum = pgEnum("person_status_enum", [
  "active",
  "inactive",
  "deceased",
]);

export const userAccountStatusEnum = pgEnum("user_account_status_enum", [
  "active",
  "inactive",
  "locked",
]);

export const authSessionStatusEnum = pgEnum("auth_session_status_enum", [
  "active",
  "revoked",
  "expired",
]);

export const consentStatusEnum = pgEnum("consent_status_enum", [
  "granted",
  "revoked",
  "expired",
]);

// ============================================================
// LOGS
// ============================================================
