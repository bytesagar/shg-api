import {
  pgTable,
  serial,
  varchar,
  integer,
  date,
  timestamp,
  text,
  pgEnum,
  boolean,
  real,
  uniqueIndex,
  index,
  jsonb,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ============================================================
// ENUMS
// ============================================================

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

export const system_logs = pgTable("system_logs", {
  id: uuid("id")
    .primaryKey()
    .notNull()
    .default(sql`gen_random_uuid()`),
  level: logLevelEnum("level").notNull(),
  message: text("message").notNull(),
  resource: varchar("resource", { length: 100 }),
  meta: jsonb("meta"),
  userId: uuid("user_id"),
  ipAddress: varchar("ip_address", { length: 50 }),
  method: varchar("method", { length: 10 }),
  path: varchar("path", { length: 255 }),
  statusCode: integer("status_code"),
  duration: integer("duration"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================
// GEOGRAPHY
// ============================================================

export const provinces = pgTable("provinces", {
  id: uuid("id")
    .primaryKey()
    .notNull()
    .default(sql`gen_random_uuid()`),
  name: jsonb("name").notNull(), // { en: string, np: string }
  code: integer("code").notNull(),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
  deletedBy: uuid("deleted_by"),
  deletedAt: timestamp("deleted_at"),
});

export const districts = pgTable("districts", {
  id: uuid("id")
    .primaryKey()
    .notNull()
    .default(sql`gen_random_uuid()`),
  provinceId: uuid("province_id")
    .notNull()
    .references(() => provinces.id),
  code: integer("code").notNull(),
  name: jsonb("name").notNull(), // { en: string, np: string }
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
  deletedBy: uuid("deleted_by"),
  deletedAt: timestamp("deleted_at"),
});

export const municipalities = pgTable("municipalities", {
  id: uuid("id")
    .primaryKey()
    .notNull()
    .default(sql`gen_random_uuid()`),
  districtId: uuid("district_id")
    .notNull()
    .references(() => districts.id),
  code: integer("code").notNull(),
  name: jsonb("name").notNull(), // { en: string, np: string }
  noOfWards: integer("no_of_wards").notNull(),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
  deletedBy: uuid("deleted_by"),
  deletedAt: timestamp("deleted_at"),
});

// ============================================================
// HEALTH FACILITY
// ============================================================

export const health_facilities = pgTable(
  "health_facilities",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 255 }).notNull(),
    address: text("address"),
    phone: varchar("phone", { length: 50 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    ward: varchar("ward", { length: 100 }).notNull(),
    palika: varchar("palika", { length: 255 }).notNull(),
    district: varchar("district", { length: 255 }).notNull(),
    province: varchar("province", { length: 255 }).notNull(),
    provinceId: uuid("province_id").references(() => provinces.id),
    districtId: uuid("district_id").references(() => districts.id),
    municipalityId: uuid("municipality_id").references(() => municipalities.id),
    inchargeName: varchar("incharge_name", { length: 255 }).notNull(),
    hfCode: varchar("hf_code", { length: 100 }),
    authorityLevel: varchar("authority_level", { length: 100 }),
    authority: varchar("authority", { length: 255 }),
    ownership: varchar("ownership", { length: 255 }),
    facilityType: varchar("facility_type", { length: 100 }),
    ecologicalZone: ecologicalZoneEnum("ecological_zone"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("health_facility_hf_code_idx").on(t.hfCode),
    index("health_facility_name_idx").on(t.name),
  ],
);

export const health_facility_registries = pgTable(
  "health_facility_registries",
  {
    code: varchar("code", { length: 100 }).primaryKey(),
    name: jsonb("name").notNull(), // { en: string, np: string }
    municipalityId: uuid("municipality_id")
      .notNull()
      .references(() => municipalities.id),
    authority: varchar("authority", { length: 255 }).notNull(),
    ownership: varchar("ownership", { length: 255 }).notNull(),
    level: varchar("level", { length: 100 }).notNull(),
  },
);

// ============================================================
// USER & AUTH
// ============================================================

export const user_roles = pgTable("user_roles", {
  id: uuid("id")
    .primaryKey()
    .notNull()
    .default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  permissions: text("permissions")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  deletedBy: uuid("deleted_by"),
  deletedAt: timestamp("deleted_at"),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    email: varchar("email", { length: 255 }).notNull(),
    username: varchar("username", { length: 255 }),
    personId: uuid("person_id")
      .notNull()
      .references(() => persons.id),
    firstName: varchar("first_name", { length: 255 }).notNull(),
    lastName: varchar("last_name", { length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    accountStatus: userAccountStatusEnum("account_status")
      .default("active")
      .notNull(),
    failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
    lockedUntil: timestamp("locked_until"),
    lastLoginAt: timestamp("last_login_at"),
    userType: userRoleEnum("user_type").notNull(),
    phoneNumber: varchar("phone_number", { length: 50 }).notNull(),
    designation: varchar("designation", { length: 255 }),
    callStatus: integer("call_status"),
    facilityId: uuid("facility_id").references(() => health_facilities.id),
    municipalityId: uuid("municipality_id").references(() => municipalities.id),
    userRoleId: uuid("user_role_id").references(() => user_roles.id),
    specialization: varchar("specialization", { length: 255 }),
    nmcRegistrationNumber: varchar("nmc_registration_number", {
      length: 100,
    }),
    signatureUrl: varchar("signature_url", { length: 500 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    uniqueIndex("user_email_unique").on(t.email),
    uniqueIndex("user_username_unique").on(t.username),
    index("user_facility_id_idx").on(t.facilityId),
    index("user_person_id_idx").on(t.personId),
  ],
);

export const user_profiles = pgTable(
  "user_profiles",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    designation: varchar("designation", { length: 255 }),
    specialization: varchar("specialization", { length: 255 }),
    signatureUrl: varchar("signature_url", { length: 500 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => [
    uniqueIndex("user_profile_user_id_unique").on(t.userId),
  ],
);

export const user_role_assignments = pgTable(
  "user_role_assignments",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    roleId: uuid("role_id")
      .notNull()
      .references(() => user_roles.id),
    facilityId: uuid("facility_id").references(() => health_facilities.id),
    municipalityId: uuid("municipality_id").references(() => municipalities.id),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => [
    index("user_role_assignment_user_id_idx").on(t.userId),
    index("user_role_assignment_role_id_idx").on(t.roleId),
    uniqueIndex("user_role_assignment_unique").on(t.userId, t.roleId, t.facilityId),
  ],
);

export const user_facility_affiliations = pgTable(
  "user_facility_affiliations",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    roleId: uuid("role_id").references(() => user_roles.id),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => [
    index("user_facility_affiliation_user_id_idx").on(t.userId),
    index("user_facility_affiliation_facility_id_idx").on(t.facilityId),
    uniqueIndex("user_facility_affiliation_unique").on(t.userId, t.facilityId),
  ],
);

export const password_resets = pgTable("password_resets", {
  id: uuid("id")
    .primaryKey()
    .notNull()
    .default(sql`gen_random_uuid()`),
  token: varchar("token", { length: 512 }).notNull(),
  expires: timestamp("expires"),
  userId: uuid("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  deletedBy: uuid("deleted_by"),
  deletedAt: timestamp("deleted_at"),
});

export const auth_sessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    refreshTokenHash: varchar("refresh_token_hash", { length: 255 }).notNull(),
    status: authSessionStatusEnum("status").default("active").notNull(),
    issuedAt: timestamp("issued_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),
    revokedReason: varchar("revoked_reason", { length: 255 }),
    lastUsedAt: timestamp("last_used_at"),
    ipAddress: varchar("ip_address", { length: 50 }),
    userAgent: varchar("user_agent", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => [
    index("auth_session_user_id_idx").on(t.userId),
    index("auth_session_status_idx").on(t.status),
    uniqueIndex("auth_session_refresh_token_hash_unique").on(t.refreshTokenHash),
  ],
);

// ============================================================
// PATIENT
// ============================================================

export const persons = pgTable(
  "persons",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    gender: genderEnum("gender"),
    bloodGroup: bloodGroupEnum("blood_group").default("unknown").notNull(),
    caste: casteEnum("caste"),
    birthDate: timestamp("birth_date"),
    deceasedAt: timestamp("deceased_at"),
    status: personStatusEnum("status").default("active").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [index("person_status_idx").on(t.status)],
);

export const person_identifiers = pgTable(
  "person_identifiers",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    personId: uuid("person_id")
      .notNull()
      .references(() => persons.id),
    system: varchar("system", { length: 255 }).notNull(),
    value: varchar("value", { length: 255 }).notNull(),
    use: varchar("use", { length: 50 }),
    isPrimary: boolean("is_primary").default(false).notNull(),
    periodStart: timestamp("period_start"),
    periodEnd: timestamp("period_end"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => [
    index("person_identifier_person_id_idx").on(t.personId),
    uniqueIndex("person_identifier_system_value_unique").on(t.system, t.value),
  ],
);

export const person_names = pgTable(
  "person_names",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    personId: uuid("person_id")
      .notNull()
      .references(() => persons.id),
    use: varchar("use", { length: 50 }),
    family: varchar("family", { length: 255 }),
    given: varchar("given", { length: 255 }),
    middle: varchar("middle", { length: 255 }),
    prefix: varchar("prefix", { length: 50 }),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => [
    index("person_name_person_id_idx").on(t.personId),
    index("person_name_primary_idx").on(t.personId, t.isPrimary),
  ],
);

export const person_contacts = pgTable(
  "person_contacts",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    personId: uuid("person_id")
      .notNull()
      .references(() => persons.id),
    system: varchar("system", { length: 20 }).notNull(),
    use: varchar("use", { length: 50 }),
    rank: integer("rank"),
    value: varchar("value", { length: 255 }).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => [
    index("person_contact_person_id_idx").on(t.personId),
    index("person_contact_system_value_idx").on(t.system, t.value),
    index("person_contact_primary_idx").on(t.personId, t.system, t.isPrimary),
  ],
);

export const person_addresses = pgTable(
  "person_addresses",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    personId: uuid("person_id")
      .notNull()
      .references(() => persons.id),
    use: varchar("use", { length: 50 }),
    line1: varchar("line1", { length: 255 }),
    line2: varchar("line2", { length: 255 }),
    municipality: varchar("municipality", { length: 255 }),
    district: varchar("district", { length: 255 }),
    province: varchar("province", { length: 255 }),
    municipalityId: uuid("municipality_id").references(() => municipalities.id),
    districtId: uuid("district_id").references(() => districts.id),
    provinceId: uuid("province_id").references(() => provinces.id),
    ward: integer("ward"),
    postalCode: varchar("postal_code", { length: 20 }),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => [
    index("person_address_person_id_idx").on(t.personId),
    index("person_address_municipality_id_idx").on(t.municipalityId),
    index("person_address_district_id_idx").on(t.districtId),
    index("person_address_province_id_idx").on(t.provinceId),
  ],
);

export const patients = pgTable(
  "patients",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    personId: uuid("person_id")
      .notNull()
      .references(() => persons.id),
    patientId: varchar("patient_id", { length: 100 }).notNull(),
    service: varchar("service", { length: 255 }).notNull(),
    education: varchar("education", { length: 255 }),
    occupation: varchar("occupation", { length: 255 }),
    occupationOther: varchar("occupation_other", { length: 255 }),
    spouseName: varchar("spouse_name", { length: 255 }),
    childrenMale: integer("children_male"),
    childrenFemale: integer("children_female"),
    // Facility's existing register number + date (legacy paper book-keeping).
    // registrationNo is kept if provided, otherwise generated; registrationDate
    // defaults to today (YYYY-MM-DD) when absent.
    registrationNo: varchar("registration_no", { length: 100 }),
    registrationDate: date("registration_date", { mode: "string" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
    facilityId: uuid("facility_id").references(() => health_facilities.id),
    assignedUserId: uuid("assigned_user_id").references(() => users.id),
    status: patientStatusEnum("status").default("active").notNull(),
  },
  (t) => [
    uniqueIndex("patient_patient_id_unique").on(
      t.patientId,
    ),
    index("patient_facility_id_idx").on(t.facilityId),
    index("patient_person_id_idx").on(t.personId),
  ],
);

export const patient_identifiers = pgTable(
  "patient_identifiers",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    system: varchar("system", { length: 255 }).notNull(),
    value: varchar("value", { length: 255 }).notNull(),
    use: varchar("use", { length: 50 }),
    isPrimary: boolean("is_primary").default(false).notNull(),
    periodStart: timestamp("period_start"),
    periodEnd: timestamp("period_end"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => [
    index("patient_identifier_patient_id_idx").on(t.patientId),
    uniqueIndex("patient_identifier_system_value_unique").on(t.system, t.value),
  ],
);

export const consents = pgTable(
  "consents",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    personId: uuid("person_id").references(() => persons.id),
    purpose: varchar("purpose", { length: 100 }).notNull(),
    scope: varchar("scope", { length: 100 }).notNull(),
    status: consentStatusEnum("status").default("granted").notNull(),
    grantedAt: timestamp("granted_at").defaultNow().notNull(),
    revokedAt: timestamp("revoked_at"),
    expiresAt: timestamp("expires_at"),
    grantedByUserId: uuid("granted_by_user_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => [
    index("consent_patient_id_idx").on(t.patientId),
    index("consent_purpose_status_idx").on(t.purpose, t.status),
  ],
);

export const practitioners = pgTable(
  "practitioners",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    personId: uuid("person_id")
      .notNull()
      .references(() => persons.id),
    userId: uuid("user_id").references(() => users.id),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => [index("practitioner_person_id_idx").on(t.personId)],
);

export const practitioner_role_assignments = pgTable(
  "practitioner_role_assignments",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    practitionerId: uuid("practitioner_id")
      .notNull()
      .references(() => practitioners.id),
    facilityId: uuid("facility_id").references(() => health_facilities.id),
    municipalityId: uuid("municipality_id").references(() => municipalities.id),
    roleCode: varchar("role_code", { length: 100 }).notNull(),
    specialty: varchar("specialty", { length: 255 }),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => [
    index("practitioner_role_assignment_practitioner_id_idx").on(t.practitionerId),
    index("practitioner_role_assignment_facility_id_idx").on(t.facilityId),
    index("practitioner_role_assignment_role_active_idx").on(t.roleCode, t.active),
  ],
);

export const audit_events = pgTable(
  "audit_events",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    actorPersonId: uuid("actor_person_id").references(() => persons.id),
    patientId: uuid("patient_id").references(() => patients.id),
    action: varchar("action", { length: 100 }).notNull(),
    resourceType: varchar("resource_type", { length: 100 }),
    resourceId: uuid("resource_id"),
    outcome: varchar("outcome", { length: 50 }),
    facilityId: uuid("facility_id").references(() => health_facilities.id),
    ipAddress: varchar("ip_address", { length: 50 }),
    userAgent: varchar("user_agent", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("audit_event_actor_user_id_idx").on(t.actorUserId),
    index("audit_event_patient_id_idx").on(t.patientId),
    index("audit_event_created_at_idx").on(t.createdAt),
  ],
);

// ============================================================
// VISITS (clinical encounter sessions)
// ============================================================

export const visits = pgTable(
  "visits",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    date: date("date", { mode: "string" }).notNull(),
    reason: text("reason").notNull(),
    service: varchar("service", { length: 255 }),
    status: visitStatusEnum("status").default("planned"),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    facilityId: uuid("facility_id").references(() => health_facilities.id),
    followUpId: uuid("follow_up_id"),
    doctorId: uuid("doctor_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("visit_patient_id_idx").on(t.patientId),
    index("visit_doctor_id_idx").on(t.doctorId),
    index("visit_facility_id_idx").on(t.facilityId),
  ],
);

export const encounters = pgTable(
  "encounters",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    encounterAt: timestamp("encounter_at").defaultNow().notNull(),
    reason: text("reason").notNull(),
    service: varchar("service", { length: 255 }),
    status: visitStatusEnum("status").default("planned"),
    encounterType: varchar("encounter_type", { length: 100 }).notNull(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => visits.id),
    facilityId: uuid("facility_id").references(() => health_facilities.id),
    followUpId: uuid("follow_up_id"),
    doctorId: uuid("doctor_id").references(() => users.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("encounter_patient_id_idx").on(t.patientId),
    index("encounter_visit_id_idx").on(t.visitId),
    index("encounter_doctor_id_idx").on(t.doctorId),
    index("encounter_facility_id_idx").on(t.facilityId),
    index("encounter_at_idx").on(t.encounterAt),
    index("encounter_facility_patient_at_idx").on(
      t.facilityId,
      t.patientId,
      t.encounterAt,
    ),
  ],
);

// ============================================================
// CLINICAL TABLES
// ============================================================

export const vitals = pgTable(
  "vitals",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    diastolic: integer("diastolic"),
    systolic: integer("systolic"),
    temperature: real("temperature").notNull(),
    pulse: integer("pulse"),
    respiratoryRate: integer("respiratory_rate").notNull(),
    spo2: integer("spo2").notNull(),
    weight: real("weight"),
    height: real("height"),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => visits.id),
    encounterId: uuid("encounter_id").references(() => encounters.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    deletedBy: uuid("deleted_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("vital_visit_id_idx").on(t.visitId),
    index("vital_encounter_id_idx").on(t.encounterId),
    index("vital_encounter_created_idx").on(t.encounterId, t.createdAt),
  ],
);

export const histories = pgTable(
  "histories",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    medical: text("medical").notNull(),
    surgical: text("surgical").notNull(),
    obGyn: text("ob_gyn").notNull(),
    medication: text("medication").notNull(),
    familyHistory: text("family_history").notNull(),
    social: text("social").notNull(),
    other: text("other"),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => visits.id),
    encounterId: uuid("encounter_id").references(() => encounters.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    deletedBy: uuid("deleted_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("history_visit_id_idx").on(t.visitId),
    index("history_encounter_id_idx").on(t.encounterId),
  ],
);

export const complaints = pgTable(
  "complaints",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    title: varchar("title", { length: 500 }).notNull(),
    duration: integer("duration"),
    durationUnit: durationUnitEnum("duration_unit").notNull(),
    severity: severityEnum("severity").notNull(),
    description: text("description").notNull(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => visits.id),
    encounterId: uuid("encounter_id").references(() => encounters.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    deletedBy: uuid("deleted_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("complaint_patient_id_idx").on(t.patientId),
    index("complaint_visit_id_idx").on(t.visitId),
    index("complaint_encounter_id_idx").on(t.encounterId),
  ],
);

export const physical_examinations = pgTable(
  "physical_examinations",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    generalCondition: text("general_condition").notNull(),
    chest: text("chest").notNull(),
    cvs: text("cvs").notNull(),
    cns: text("cns").notNull(),
    perabdominal: text("perabdominal").notNull(),
    localExamination: text("local_examination").notNull(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => visits.id),
    encounterId: uuid("encounter_id").references(() => encounters.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("physical_examination_patient_id_idx").on(t.patientId),
    index("physical_examination_visit_id_idx").on(t.visitId),
    index("physical_examination_encounter_id_idx").on(t.encounterId),
  ],
);

export const provisional_diagnoses = pgTable(
  "provisional_diagnoses",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    description: text("description").notNull(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => visits.id),
    encounterId: uuid("encounter_id").references(() => encounters.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("provisional_diagnosis_patient_id_idx").on(t.patientId),
    index("provisional_diagnosis_visit_id_idx").on(t.visitId),
    index("provisional_diagnosis_encounter_id_idx").on(t.encounterId),
    index("provisional_diagnosis_patient_created_idx").on(t.patientId, t.createdAt),
  ],
);

export const confirm_diagnoses = pgTable(
  "confirm_diagnoses",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    icdCode: varchar("icd_code", { length: 50 }),
    description: text("description").notNull(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => visits.id),
    encounterId: uuid("encounter_id").references(() => encounters.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("confirm_diagnosis_patient_id_idx").on(t.patientId),
    index("confirm_diagnosis_visit_id_idx").on(t.visitId),
    index("confirm_diagnosis_encounter_id_idx").on(t.encounterId),
    index("confirm_diagnosis_patient_created_idx").on(t.patientId, t.createdAt),
  ],
);

/** ICD-11 MMS reference rows (e.g. Nepal common list); not facility-scoped. */
export const icd11_codes = pgTable(
  "icd11_codes",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    code: varchar("code", { length: 50 }).notNull(),
    title: text("title").notNull(),
    category: varchar("category", { length: 255 }).notNull(),
  },
  (t) => [
    uniqueIndex("icd11_codes_code_uidx").on(t.code),
    index("icd11_codes_category_idx").on(t.category),
  ],
);

export const tests = pgTable(
  "tests",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    testName: varchar("test_name", { length: 255 }).notNull(),
    testResult: text("test_result"),
    testCategory: testCategoryEnum("test_category").notNull(),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => visits.id),
    encounterId: uuid("encounter_id").references(() => encounters.id),
    attachmentId: uuid("attachment_id").references(() => attachments.id, {
      onDelete: "set null",
    }),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    deletedBy: uuid("deleted_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("test_visit_id_idx").on(t.visitId),
    index("test_encounter_id_idx").on(t.encounterId),
    index("test_encounter_created_idx").on(t.encounterId, t.createdAt),
  ],
);

export const treatments = pgTable(
  "treatments",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    medicalAdvise: text("medical_advise"),
    followUpText: text("follow_up_text"),
    followUpDate: timestamp("follow_up_date"),
    refer: varchar("refer", { length: 255 }),
    referReason: text("refer_reason"),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => visits.id),
    encounterId: uuid("encounter_id").references(() => encounters.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("treatment_patient_id_idx").on(t.patientId),
    index("treatment_visit_id_idx").on(t.visitId),
    index("treatment_encounter_id_idx").on(t.encounterId),
  ],
);

export const medications = pgTable(
  "medications",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    type: varchar("type", { length: 100 }),
    medicineName: varchar("medicine_name", { length: 500 }),
    dosage: varchar("dosage", { length: 255 }),
    times: varchar("times", { length: 100 }),
    route: varchar("route", { length: 100 }),
    beforeAfter: varchar("before_after", { length: 50 }),
    duration: varchar("duration", { length: 100 }),
    specialNotes: text("special_notes"),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => visits.id),
    encounterId: uuid("encounter_id").references(() => encounters.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("medication_patient_id_idx").on(t.patientId),
    index("medication_visit_id_idx").on(t.visitId),
    index("medication_encounter_id_idx").on(t.encounterId),
    index("medication_patient_created_idx").on(t.patientId, t.createdAt),
  ],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 500 }),
    path: text("path"),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    visitId: uuid("visit_id").references(() => visits.id),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("document_patient_id_idx").on(t.patientId),
  ],
);

/** Polymorphic file metadata; `file_url` stores the S3 object key (private bucket). */
export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    sourceType: varchar("source_type", { length: 50 }).notNull(),
    sourceId: uuid("source_id").notNull(),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    name: varchar("name", { length: 500 }).notNull(),
    /** Application-level type tag: lab | imaging | other | document. */
    category: varchar("category", { length: 50 }),
    fileUrl: text("file_url").notNull(),
    fileSize: integer("file_size"),
    fileType: varchar("file_type", { length: 255 }),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("attachment_facility_id_idx").on(t.facilityId),
    index("attachment_source_idx").on(t.sourceType, t.sourceId),
    index("attachment_facility_source_created_idx").on(
      t.facilityId,
      t.sourceType,
      t.createdAt,
    ),
  ],
);

export const call_requests = pgTable("call_requests", {
  id: uuid("id")
    .primaryKey()
    .notNull()
    .default(sql`gen_random_uuid()`),
  fromUserId: uuid("from_user_id").references(() => users.id),
  toUserId: uuid("to_user_id").references(() => users.id),
  patientId: uuid("patient_id").references(() => patients.id),
  status: callRequestStatusEnum("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
  deletedBy: uuid("deleted_by"),
  deletedAt: timestamp("deleted_at"),
});

// ============================================================
// MATERNAL HEALTH
// ============================================================

export const pregnancies = pgTable(
  "pregnancies",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    firstVisit: date("first_visit", { mode: "string" }).notNull(),
    gravida: varchar("gravida", { length: 50 }).notNull(),
    para: varchar("para", { length: 50 }),
    lastMenstruationPeriod: date("last_menstruation_period", {
      mode: "string",
    }),
    expectedDeliveryDate: date("expected_delivery_date", { mode: "string" }),
    status: pregnancyStatusEnum("status").default("active").notNull(),
    endedAt: timestamp("ended_at"),
    visitId: uuid("visit_id").references(() => visits.id),
    encounterId: uuid("encounter_id").references(() => encounters.id),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    facilityId: uuid("facility_id").references(() => health_facilities.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
    assignedFchvId: uuid("assigned_fchv_id").references(() => users.id),

    // ---- HMIS 2082 extensions ----
    // Ethnicity snapshot so historical aggregates stay stable.
    hmisEthnicCode: hmisEthnicCodeEnum("hmis_ethnic_code"),

    // Structured obstetric history (free-text gravida/para kept above).
    gravidaNum: integer("gravida_num"),
    paraNum: integer("para_num"),
    abortionsNum: integer("abortions_num"),
    livingChildrenNum: integer("living_children_num"),

    // One-time screenings during pregnancy.
    rousgFirstDate: date("rousg_first_date", { mode: "string" }),
    hivTestDate: date("hiv_test_date", { mode: "string" }),
    hivResult: testResultEnum("hiv_result"),
    hivTreatmentOrReferral: text("hiv_treatment_or_referral"),
    hbsagTestDate: date("hbsag_test_date", { mode: "string" }),
    hbsagResult: testResultEnum("hbsag_result"),
    hbsagTreatmentOrReferral: text("hbsag_treatment_or_referral"),
    syphilisTreponemalDate: date("syphilis_treponemal_date", { mode: "string" }),
    syphilisTreponemalResult: testResultEnum("syphilis_treponemal_result"),
    syphilisNontreponemalDate: date("syphilis_nontreponemal_date", {
      mode: "string",
    }),
    syphilisNontreponemalResult: testResultEnum("syphilis_nontreponemal_result"),
    syphilisTreatmentOrReferral: text("syphilis_treatment_or_referral"),
    tbSputumTestDate: date("tb_sputum_test_date", { mode: "string" }),
    dewormingDate: date("deworming_date", { mode: "string" }),

    // TD vaccine doses.
    td1Date: date("td1_date", { mode: "string" }),
    td2Date: date("td2_date", { mode: "string" }),
    td2plusDate: date("td2plus_date", { mode: "string" }),

    // Aama ANC encouragement (NPR 800 if 4-visit protocol completed).
    ancIncentiveEligible: boolean("anc_incentive_eligible"),
    ancIncentiveReceived: boolean("anc_incentive_received"),
    ancIncentiveAmount: integer("anc_incentive_amount"),
    ancIncentiveReasonIfNot: text("anc_incentive_reason_if_not"),
    ancIncentivePaidAt: date("anc_incentive_paid_at", { mode: "string" }),

    // Flips true when schema-completeness checks pass (drives HMIS analytics).
    hmisCompliant: boolean("hmis_compliant").default(false).notNull(),
  },
  (t) => [
    index("pregnancy_patient_id_idx").on(t.patientId),
    index("pregnancy_visit_id_idx").on(t.visitId),
    index("pregnancy_encounter_id_idx").on(t.encounterId),
    index("pregnancy_facility_patient_first_visit_idx").on(
      t.facilityId,
      t.patientId,
      t.firstVisit,
    ),
  ],
);

export const antenatal_cares = pgTable(
  "antenatal_cares",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    ancVisitDate: date("anc_visit_date", { mode: "string" }),
    visitingTimeWeek: varchar("visiting_time_week", { length: 50 }),
    visitingTimeMonth: varchar("visiting_time_month", { length: 50 }),
    motherWeight: real("mother_weight"),
    anemia: integer("anemia"),
    edema: integer("edema"),
    systolic: integer("systolic"),
    diastolic: integer("diastolic"),
    pregnancyPeriodWeek: varchar("pregnancy_period_week", { length: 50 }),
    fundalHeight: real("fundal_height"),
    babyPresentation: varchar("baby_presentation", { length: 255 }),
    heartRate: integer("heart_rate"),
    otherProblems: text("other_problems"),
    treatment: text("treatment"),
    medicalAdvice: text("medical_advice"),
    nextVisitSchedule: date("next_visit_schedule", { mode: "string" }),
    ironTablet: integer("iron_tablet"),
    albendazole: integer("albendazole"),
    tdVaccination: varchar("td_vaccination", { length: 255 }),
    obstructiveComplications: text("obstructive_complications"),
    obstructiveComplicationsOther: text("obstructive_complications_other"),
    dangerSign: text("danger_sign"),
    dangerSignOther: text("danger_sign_other"),
    visitId: uuid("visit_id").references(() => visits.id),
    encounterId: uuid("encounter_id").references(() => encounters.id),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    pregnancyId: uuid("pregnancy_id")
      .notNull()
      .references(() => pregnancies.id),
    documentUrl: varchar("document_url", { length: 500 }),
    doctorFeedback: text("doctor_feedback"),
    refer: varchar("refer", { length: 255 }),
    referReason: text("refer_reason"),
    calcium: integer("calcium"),
    folicAcid: integer("folic_acid"),
    investigation: text("investigation"),
    serviceProvidedBy: uuid("service_provided_by").references(() => users.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),

    // ---- HMIS 2082 extensions ----
    protocolVisitNumber: ancProtocolVisitEnum("protocol_visit_number"),
    protocolWindowViolation: boolean("protocol_window_violation")
      .default(false)
      .notNull(),
    gestationalAgeWeeks: integer("gestational_age_weeks"),
    anaemiaPresent: boolean("anaemia_present"),
    edemaLocation: varchar("edema_location", { length: 20 }),
    motherHeightCm: real("mother_height_cm"),
    bmi: real("bmi"),
  },
  (t) => [
    index("antenatal_care_patient_id_idx").on(t.patientId),
    index("antenatal_care_pregnancy_id_idx").on(t.pregnancyId),
    index("antenatal_care_visit_id_idx").on(t.visitId),
    index("antenatal_care_encounter_id_idx").on(t.encounterId),
    index("antenatal_care_protocol_visit_idx").on(
      t.pregnancyId,
      t.protocolVisitNumber,
    ),
  ],
);

export const deliveries = pgTable(
  "deliveries",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    deliveryDate: date("delivery_date", { mode: "string" }),
    placeOfDelivery: varchar("place_of_delivery", { length: 255 }),
    otherPlaceOfDelivery: varchar("other_place_of_delivery", {
      length: 255,
    }),
    babyPresentation: varchar("baby_presentation", { length: 255 }),
    typeOfDelivery: varchar("type_of_delivery", { length: 255 }),
    noOfLiveMaleBaby: integer("no_of_live_male_baby"),
    noOfLiveFemaleBaby: integer("no_of_live_female_baby"),
    noOfStillMaleBaby: integer("no_of_still_male_baby"),
    noOfStillFemaleBaby: integer("no_of_still_female_baby"),
    noOfFreshStillBirth: integer("no_of_fresh_still_birth"),
    noOfMaceratedStillBirth: integer("no_of_macerated_still_birth"),
    deliveryAttendedBy: varchar("delivery_attended_by", { length: 255 }),
    otherProblems: text("other_problems"),
    treatment: text("treatment"),
    investigation: text("investigation"),
    doctorFeedback: text("doctor_feedback"),
    refer: varchar("refer", { length: 255 }),
    referReason: text("refer_reason"),
    vitaminK: integer("vitamin_k"),
    umbilicalCream: integer("umbilical_cream"),
    visitId: uuid("visit_id").references(() => visits.id),
    encounterId: uuid("encounter_id").references(() => encounters.id),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    pregnancyId: uuid("pregnancy_id")
      .notNull()
      .references(() => pregnancies.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),

    // ---- HMIS 2082 extensions ----
    admissionAt: timestamp("admission_at"),
    deliveryAt: timestamp("delivery_at"),
    dischargeAt: timestamp("discharge_at"),
    laborType: laborTypeEnum("labor_type"),
    fetalPresentation: fetalPresentationEnum("fetal_presentation"),
    deliveryMode: deliveryModeEnum("delivery_mode"),
    placeCode: deliveryPlaceEnum("place_code"),
    otherFacilityName: varchar("other_facility_name", { length: 255 }),
    birthAttendant: birthAttendantEnum("birth_attendant"),

    noOfLiveTermBabies: integer("no_of_live_term_babies"),
    noOfLivePretermBabies: integer("no_of_live_preterm_babies"),
    noOfStillIntrapartum: integer("no_of_still_intrapartum"),
    noOfStillAntepartum: integer("no_of_still_antepartum"),

    oxytocinGiven: boolean("oxytocin_given"),
    kmcGiven: boolean("kmc_given"),
    earlyBreastfeedingWithin1h: boolean("early_breastfeeding_within_1h"),
    antiDGiven: boolean("anti_d_given"),
    warmBagDistributed: boolean("warm_bag_distributed"),
    warmBagReasonIfNot: text("warm_bag_reason_if_not"),
    bloodTransfusionPints: integer("blood_transfusion_pints").default(0),
    cabinUsed: boolean("cabin_used"),

    maternalOutcome: maternalOutcomeEnum("maternal_outcome"),
    referredToFacilityId: uuid("referred_to_facility_id").references(
      () => health_facilities.id,
    ),

    transportIncentiveEligible: boolean("transport_incentive_eligible"),
    transportIncentiveReceived: boolean("transport_incentive_received"),
    transportIncentiveAmount: integer("transport_incentive_amount"),
    transportIncentiveReasonIfNot: text("transport_incentive_reason_if_not"),
  },
  (t) => [
    index("delivery_patient_id_idx").on(t.patientId),
    index("delivery_pregnancy_id_idx").on(t.pregnancyId),
    index("delivery_visit_id_idx").on(t.visitId),
    index("delivery_encounter_id_idx").on(t.encounterId),
    index("delivery_mode_idx").on(t.deliveryMode),
    index("delivery_place_idx").on(t.placeCode),
  ],
);

export const delivery_children = pgTable(
  "delivery_children",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    deliveryId: uuid("delivery_id")
      .notNull()
      .references(() => deliveries.id),
    weightOfBaby: real("weight_of_baby"),
    newBornBabyStatus: varchar("new_born_baby_status", { length: 255 }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    pregnancyId: uuid("pregnancy_id")
      .notNull()
      .references(() => pregnancies.id),
    apgarScore1: integer("apgar_score_1"),
    apgarScore2: integer("apgar_score_2"),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),

    // ---- HMIS 2082 extensions ----
    sex: genderEnum("sex"),
    neonatalStatus: neonatalStatusEnum("neonatal_status"),
    isTerm: boolean("is_term"),
    congenitalAnomalyMajor: boolean("congenital_anomaly_major"),
    congenitalAnomalyMinor: boolean("congenital_anomaly_minor"),
    congenitalAnomalyOtherCount: integer("congenital_anomaly_other_count"),
    congenitalAnomalyIcdCode: varchar("congenital_anomaly_icd_code", {
      length: 50,
    }),
  },
  (t) => [
    index("delivery_children_delivery_id_idx").on(t.deliveryId),
    index("delivery_children_patient_id_idx").on(t.patientId),
  ],
);

export const postnatal_cares = pgTable(
  "postnatal_cares",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    visitingTime: varchar("visiting_time", { length: 100 }).notNull(),
    visitTime: varchar("visit_time", { length: 100 }).notNull(),
    visitDate: date("visit_date", { mode: "string" }).notNull(),
    conditionOfMother: text("condition_of_mother").notNull(),
    conditionOfBaby: text("condition_of_baby").notNull(),
    medicalAdvice: text("medical_advice").notNull(),
    familyPlanningServices: text("family_planning_services").notNull(),
    complications: text("complications").notNull(),
    dangerSignsOnMother: text("danger_signs_on_mother").notNull(),
    dangerSignsOnBaby: text("danger_signs_on_baby").notNull(),
    checkupAttendedBy: varchar("checkup_attended_by", {
      length: 255,
    }).notNull(),
    newBornBabyStatus: varchar("new_born_baby_status", {
      length: 255,
    }).notNull(),
    refer: varchar("refer", { length: 255 }),
    referReason: text("refer_reason"),
    otherProblems: text("other_problems"),
    treatment: text("treatment").notNull(),
    investigation: text("investigation"),
    doctorFeedback: text("doctor_feedback"),
    ironTablet: integer("iron_tablet"),
    calcium: integer("calcium"),
    visitId: uuid("visit_id").references(() => visits.id),
    encounterId: uuid("encounter_id").references(() => encounters.id),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    pregnancyId: uuid("pregnancy_id")
      .notNull()
      .references(() => pregnancies.id),
    serviceProvidedBy: uuid("service_provided_by").references(() => users.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),

    // ---- HMIS 2082 extensions ----
    protocolVisitNumber: pncProtocolVisitEnum("protocol_visit_number"),
    locationCode: varchar("location_code", { length: 20 }), // facility | home
    familyPlanningServiceType: familyPlanningPostpartumTypeEnum(
      "family_planning_service_type",
    ),
    fpGivenWithin48h: boolean("fp_given_within_48h"),
    fpGivenWithin42d: boolean("fp_given_within_42d"),
    vitaminKDate: date("vitamin_k_date", { mode: "string" }),
    postnatalBloodTransfusionPints: integer(
      "postnatal_blood_transfusion_pints",
    ).default(0),
  },
  (t) => [
    index("postnatal_care_patient_id_idx").on(t.patientId),
    index("postnatal_care_pregnancy_id_idx").on(t.pregnancyId),
    index("postnatal_care_patient_visit_date_idx").on(t.patientId, t.visitDate),
    index("postnatal_care_visit_id_idx").on(t.visitId),
    index("postnatal_care_encounter_id_idx").on(t.encounterId),
    index("postnatal_care_protocol_visit_idx").on(
      t.pregnancyId,
      t.protocolVisitNumber,
    ),
  ],
);

export const home_mother_postnatal_cares = pgTable(
  "home_mother_postnatal_cares",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    visitingTime: varchar("visiting_time", { length: 100 }).notNull(),
    visitTime: varchar("visit_time", { length: 100 }).notNull(),
    visitDate: timestamp("visit_date").notNull(),
    pulse: real("pulse").notNull(),
    bodyTemperature: real("body_temperature").notNull(),
    bpSystolic: integer("bp_systolic").notNull(),
    bpDiastolic: integer("bp_diastolic").notNull(),
    ppHaemorage: text("pp_haemorage").notNull(),
    ppHaemorageTreatment: text("pp_haemorage_treatment").notNull(),
    breastExamination: text("breast_examination").notNull(),
    edema: text("edema").notNull(),
    examinationOfUterus: text("examination_of_uterus").notNull(),
    vaginalExamination: text("vaginal_examination").notNull(),
    urinationDifficulties: text("urination_difficulties").notNull(),
    vaginalDischarge: text("vaginal_discharge"),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    pregnancyId: uuid("pregnancy_id")
      .notNull()
      .references(() => pregnancies.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("home_mother_pnc_patient_id_idx").on(t.patientId),
    index("home_mother_pnc_pregnancy_id_idx").on(t.pregnancyId),
  ],
);

export const home_baby_postnatal_cares = pgTable(
  "home_baby_postnatal_cares",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    visitingTime: varchar("visiting_time", { length: 100 }).notNull(),
    visitTime: varchar("visit_time", { length: 100 }).notNull(),
    visitDate: timestamp("visit_date").notNull(),
    activities: text("activities").notNull(),
    respiration: integer("respiration").notNull(),
    temperature: real("temperature").notNull(),
    umbilicalArea: text("umbilical_area").notNull(),
    skin: text("skin").notNull(),
    eye: text("eye").notNull(),
    jaundice: text("jaundice").notNull(),
    breastFeeding: text("breast_feeding").notNull(),
    stool: text("stool").notNull(),
    urination: text("urination").notNull(),
    umbilicalCream: text("umbilical_cream"),
    healthCareProvider: varchar("health_care_provider", {
      length: 255,
    }).notNull(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    pregnancyId: uuid("pregnancy_id")
      .notNull()
      .references(() => pregnancies.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("home_baby_pnc_patient_id_idx").on(t.patientId),
    index("home_baby_pnc_pregnancy_id_idx").on(t.pregnancyId),
  ],
);

// ============================================================
// HMIS 2082 — STRUCTURED COMPLICATIONS, HISTORY, DEATHS, AAMA
// ============================================================

export const facility_population_targets = pgTable(
  "facility_population_targets",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    fiscalYear: integer("fiscal_year").notNull(),
    expectedPregnancies: integer("expected_pregnancies").notNull(),
    expectedDeliveries: integer("expected_deliveries").notNull(),
    targetSetBy: uuid("target_set_by").references(() => users.id),
    targetSetAt: timestamp("target_set_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    uniqueIndex("facility_population_target_unique").on(
      t.facilityId,
      t.fiscalYear,
    ),
  ],
);

export const pregnancy_complications = pgTable(
  "pregnancy_complications",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    pregnancyId: uuid("pregnancy_id")
      .notNull()
      .references(() => pregnancies.id),
    stage: complicationStageEnum("stage").notNull(),
    icd11Code: varchar("icd11_code", { length: 50 }),
    icd11Title: text("icd11_title"),
    management: complicationManagementEnum("management"),
    referredToFacilityId: uuid("referred_to_facility_id").references(
      () => health_facilities.id,
    ),
    notes: text("notes"),
    recordedAt: timestamp("recorded_at").defaultNow().notNull(),
    recordedAtAncId: uuid("recorded_at_anc_id").references(
      () => antenatal_cares.id,
    ),
    recordedAtDeliveryId: uuid("recorded_at_delivery_id").references(
      () => deliveries.id,
    ),
    recordedAtPncId: uuid("recorded_at_pnc_id").references(
      () => postnatal_cares.id,
    ),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("pregnancy_complication_pregnancy_idx").on(t.pregnancyId),
    index("pregnancy_complication_stage_icd_idx").on(t.stage, t.icd11Code),
    index("pregnancy_complication_facility_recorded_at_idx").on(
      t.facilityId,
      t.recordedAt,
    ),
  ],
);

export const previous_pregnancies = pgTable(
  "previous_pregnancies",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    pregnancyId: uuid("pregnancy_id")
      .notNull()
      .references(() => pregnancies.id),
    ordinal: integer("ordinal").notNull(),
    year: integer("year"),
    outcome: varchar("outcome", { length: 40 }),
    deliveryMode: deliveryModeEnum("delivery_mode"),
    complicationIcd11Code: varchar("complication_icd11_code", { length: 50 }),
    liveBirth: boolean("live_birth"),
    stillBirth: boolean("still_birth"),
    preterm: boolean("preterm"),
    twin: boolean("twin"),
    abortion: boolean("abortion"),
    tdDoseReceived: boolean("td_dose_received"),
    childSex: genderEnum("child_sex"),
    childCurrentAgeMonths: integer("child_current_age_months"),
    notes: text("notes"),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("previous_pregnancy_pregnancy_idx").on(t.pregnancyId),
  ],
);

export const maternal_deaths = pgTable(
  "maternal_deaths",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    pregnancyId: uuid("pregnancy_id").references(() => pregnancies.id),
    deathDate: date("death_date", { mode: "string" }).notNull(),
    place: varchar("place", { length: 30 }), // home | facility | other
    placeDetail: text("place_detail"),
    stage: maternalDeathStageEnum("stage").notNull(),
    causeIcd11Code: varchar("cause_icd11_code", { length: 50 }),
    causeText: text("cause_text"),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("maternal_death_patient_idx").on(t.patientId),
    index("maternal_death_facility_date_idx").on(t.facilityId, t.deathDate),
  ],
);

export const newborn_deaths = pgTable(
  "newborn_deaths",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    deliveryId: uuid("delivery_id").references(() => deliveries.id),
    deliveryChildId: uuid("delivery_child_id").references(
      () => delivery_children.id,
    ),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    deathDate: date("death_date", { mode: "string" }).notNull(),
    ageAtDeathHours: integer("age_at_death_hours"),
    causeIcd11Code: varchar("cause_icd11_code", { length: 50 }),
    causeText: text("cause_text"),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("newborn_death_facility_date_idx").on(t.facilityId, t.deathDate),
    index("newborn_death_patient_idx").on(t.patientId),
  ],
);

export const safe_abortions = pgTable(
  "safe_abortions",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    procedureDate: date("procedure_date", { mode: "string" }).notNull(),
    hmisEthnicCode: hmisEthnicCodeEnum("hmis_ethnic_code"),
    age: integer("age"),
    education: varchar("education", { length: 50 }),
    gravidaNum: integer("gravida_num"),
    livingChildrenNum: integer("living_children_num"),
    gestationByLmpWeeks: integer("gestation_by_lmp_weeks"),
    gestationByExamWeeks: integer("gestation_by_exam_weeks"),
    procedure: abortionProcedureEnum("procedure").notNull(),
    painManagementGiven: boolean("pain_management_given"),
    visitId: uuid("visit_id").references(() => visits.id),
    encounterId: uuid("encounter_id").references(() => encounters.id),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("safe_abortion_patient_idx").on(t.patientId),
    index("safe_abortion_facility_date_idx").on(t.facilityId, t.procedureDate),
  ],
);

export const safe_abortion_complications = pgTable(
  "safe_abortion_complications",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    safeAbortionId: uuid("safe_abortion_id")
      .notNull()
      .references(() => safe_abortions.id),
    icd11Code: varchar("icd11_code", { length: 50 }),
    icd11Title: text("icd11_title"),
    complicationKind: varchar("complication_kind", { length: 60 }),
    // incomplete_repeat | heavy_bleeding | uterine_injury | infection
    // | ongoing_pregnancy | ectopic | other
    management: complicationManagementEnum("management"),
    notes: text("notes"),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("safe_abortion_complication_abortion_idx").on(t.safeAbortionId),
  ],
);

export const post_abortion_cares = pgTable(
  "post_abortion_cares",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    safeAbortionId: uuid("safe_abortion_id").references(() => safe_abortions.id),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    indication: pacIndicationEnum("indication").notNull(),
    careDate: date("care_date", { mode: "string" }).notNull(),
    fpServiceProvided: varchar("fp_service_provided", { length: 40 }),
    notes: text("notes"),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("pac_facility_date_idx").on(t.facilityId, t.careDate),
    index("pac_patient_idx").on(t.patientId),
  ],
);

export const aama_monthly_aggregates = pgTable(
  "aama_monthly_aggregates",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    hmisEthnicCode: hmisEthnicCodeEnum("hmis_ethnic_code"),

    ancIncentiveEligibleCount: integer("anc_incentive_eligible_count")
      .default(0)
      .notNull(),
    ancIncentivePaidCount: integer("anc_incentive_paid_count")
      .default(0)
      .notNull(),
    transportEligibleCount: integer("transport_eligible_count")
      .default(0)
      .notNull(),
    transportPaidCount: integer("transport_paid_count").default(0).notNull(),

    deliveriesSpontaneous: integer("deliveries_spontaneous").default(0).notNull(),
    deliveriesVacuum: integer("deliveries_vacuum").default(0).notNull(),
    deliveriesForceps: integer("deliveries_forceps").default(0).notNull(),
    deliveriesCs: integer("deliveries_cs").default(0).notNull(),
    deliveriesTotal: integer("deliveries_total").default(0).notNull(),

    breechCount: integer("breech_count").default(0).notNull(),
    shoulderCount: integer("shoulder_count").default(0).notNull(),
    multiplePregnancyCount: integer("multiple_pregnancy_count")
      .default(0)
      .notNull(),
    referredIn: integer("referred_in").default(0).notNull(),
    referredOut: integer("referred_out").default(0).notNull(),
    complicationsManaged: integer("complications_managed").default(0).notNull(),
    antiDGiven: integer("anti_d_given").default(0).notNull(),
    bloodPintsTotal: integer("blood_pints_total").default(0).notNull(),
    cabinUsageCount: integer("cabin_usage_count").default(0).notNull(),

    computedAt: timestamp("computed_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("aama_monthly_unique").on(
      t.facilityId,
      t.year,
      t.month,
      t.hmisEthnicCode,
    ),
  ],
);

// ============================================================
// CHILD IMMUNIZATION
// ============================================================

// HMIS 2082 vaccine catalog — seeded with the Nepal EPI schedule.
// `code` is the stable join key (e.g. 'BCG', 'PENTA', 'OPV', 'PCV', 'ROTA',
// 'FIPV', 'MR', 'JE', 'TCV', 'HPV', 'TD', 'VITA_A', 'DEWORM', 'BAALVITA').
export const vaccines = pgTable(
  "vaccines",
  {
    code: varchar("code", { length: 40 }).primaryKey(),
    label: jsonb("label").notNull(), // { en: string, np: string }
    totalDoses: integer("total_doses").notNull(),
    defaultRoute: vaccineRouteEnum("default_route"),
    defaultSite: vaccineSiteEnum("default_site"),
    category: vaccineCategoryEnum("category").notNull().default("vaccine"),
    isHpv: boolean("is_hpv").default(false).notNull(),
    displayOrder: integer("display_order"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => [index("vaccines_display_order_idx").on(t.displayOrder)],
);

export const vaccine_doses = pgTable(
  "vaccine_doses",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    vaccineCode: varchar("vaccine_code", { length: 40 })
      .notNull()
      .references(() => vaccines.code),
    doseNumber: integer("dose_number").notNull(),
    label: jsonb("label").notNull(), // { en, np }
    targetAgeMinDays: integer("target_age_min_days"),
    targetAgeMaxDays: integer("target_age_max_days"),
    // milestone tags: at_birth | week_6 | week_10 | week_14 | month_9
    //   | month_12 | month_15 | campaign | school | round_1 | round_2 | round_3.
    milestone: varchar("milestone", { length: 40 }),
    displayOrder: integer("display_order"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => [
    uniqueIndex("vaccine_doses_unique").on(t.vaccineCode, t.doseNumber),
    index("vaccine_doses_milestone_idx").on(t.milestone),
  ],
);

export const child_immunizations = pgTable(
  "child_immunizations",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    mothersName: varchar("mothers_name", { length: 255 }),
    fathersName: varchar("fathers_name", { length: 255 }),
    weightAtBirth: real("weight_at_birth"),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    facilityId: uuid("facility_id").references(() => health_facilities.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),

    // ---- HMIS 2082 extensions ----
    // Note: ethnicity is NOT duplicated here — it is derived from the
    // patient's person.caste. See immunization analytics.
    birthOrder: integer("birth_order"),
    delayedScheduleStartedAtMonths: integer(
      "delayed_schedule_started_at_months",
    ),
    outOfCatchment: boolean("out_of_catchment").default(false).notNull(),
    serviceRegistrationNumber: varchar("service_registration_number", {
      length: 50,
    }),
    enrolledFiscalYear: integer("enrolled_fiscal_year"),
  },
  (t) => [
    index("child_immunization_patient_id_idx").on(t.patientId),
    index("child_immunization_facility_patient_idx").on(t.facilityId, t.patientId),
  ],
);

export const immunization_histories = pgTable(
  "immunization_histories",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    vaccineName: varchar("vaccine_name", { length: 255 }).notNull(),
    date: timestamp("date").notNull(),
    vaccinated: integer("vaccinated"),
    aefi: text("aefi"),
    vaccinatedDate: timestamp("vaccinated_date"),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    visitId: uuid("visit_id").references(() => visits.id),
    encounterId: uuid("encounter_id").references(() => encounters.id),
    childImmunizationId: uuid("child_immunization_id")
      .notNull()
      .references(() => child_immunizations.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),

    // ---- HMIS 2082 extensions ----
    // Logical FK to vaccines.code; null only for legacy/back-fill rows.
    vaccineCode: varchar("vaccine_code", { length: 40 }),
    doseNumber: integer("dose_number"),
    mode: immunizationModeEnum("mode").default("routine").notNull(),
    campaignId: uuid("campaign_id"), // FK declared after table to avoid cycle
    hpvSessionId: uuid("hpv_session_id"), // FK declared after table
    batchNumber: varchar("batch_number", { length: 60 }),
    diluentBatchNumber: varchar("diluent_batch_number", { length: 60 }),
    lotNumber: varchar("lot_number", { length: 60 }),
    expiryDate: date("expiry_date", { mode: "string" }),
    site: vaccineSiteEnum("site"),
    route: vaccineRouteEnum("route"),
    administeredBy: uuid("administered_by").references(() => users.id),
    administeredAt: timestamp("administered_at"),
    nextDoseDueDate: date("next_dose_due_date", { mode: "string" }),
    sourceFacilityName: varchar("source_facility_name", { length: 255 }),
    facilityId: uuid("facility_id").references(() => health_facilities.id),
  },
  (t) => [
    index("immunization_history_patient_id_idx").on(t.patientId),
    index("immunization_history_child_immunization_id_idx").on(
      t.childImmunizationId,
    ),
    index("immunization_history_visit_id_idx").on(t.visitId),
    index("immunization_history_encounter_id_idx").on(t.encounterId),
    index("immunization_history_patient_date_idx").on(t.patientId, t.date),
    uniqueIndex("immunization_history_patient_vaccine_dose_unique").on(
      t.patientId,
      t.vaccineCode,
      t.doseNumber,
    ),
    index("immunization_history_facility_date_idx").on(
      t.facilityId,
      t.administeredAt,
    ),
  ],
);

// HMIS 2.2.5 — campaign / outbreak-response immunization sessions.
export const immunization_campaigns = pgTable(
  "immunization_campaigns",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    vaccineCode: varchar("vaccine_code", { length: 40 }).notNull(),
    roundNumber: integer("round_number"),
    // 'national' (regular NIC round) | 'outbreak_response' (ORI).
    campaignKind: varchar("campaign_kind", { length: 30 }),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }),
    targetAgeMinMonths: integer("target_age_min_months"),
    targetAgeMaxMonths: integer("target_age_max_months"),
    targetPopulation: integer("target_population"),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("immunization_campaign_facility_start_idx").on(
      t.facilityId,
      t.startDate,
    ),
    index("immunization_campaign_vaccine_round_idx").on(
      t.vaccineCode,
      t.roundNumber,
    ),
  ],
);

// HMIS 2.2.7 — HPV school-based sessions (grades 6-10 girls).
export const hpv_school_sessions = pgTable(
  "hpv_school_sessions",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    schoolName: varchar("school_name", { length: 255 }),
    sessionDate: date("session_date", { mode: "string" }).notNull(),
    // '6'..'10' or 'out_of_school' (10-14yo girls not in school).
    grade: varchar("grade", { length: 20 }),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("hpv_school_session_facility_date_idx").on(
      t.facilityId,
      t.sessionDate,
    ),
  ],
);

// HMIS 2.2.6 — AEFI (Adverse Event Following Immunization) register.
export const aefi_events = pgTable(
  "aefi_events",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    immunizationHistoryId: uuid("immunization_history_id")
      .notNull()
      .references(() => immunization_histories.id),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    childImmunizationId: uuid("child_immunization_id")
      .notNull()
      .references(() => child_immunizations.id),
    parentName: varchar("parent_name", { length: 255 }),
    parentContact: varchar("parent_contact", { length: 50 }),
    aefiRegisteredAt: date("aefi_registered_at", { mode: "string" }).notNull(),
    vaccineCode: varchar("vaccine_code", { length: 40 }).notNull(),
    vaccineBatch: varchar("vaccine_batch", { length: 60 }),
    diluentBatch: varchar("diluent_batch", { length: 60 }),
    vaccinatedAt: timestamp("vaccinated_at"),
    vaccinationPlace: text("vaccination_place"),
    symptomOnsetAt: timestamp("symptom_onset_at"),
    symptoms: text("symptoms"),
    severity: aefiSeverityEnum("severity").notNull(),
    outcome: aefiOutcomeEnum("outcome"),
    management: text("management"),
    referredToFacilityId: uuid("referred_to_facility_id").references(
      () => health_facilities.id,
    ),
    notes: text("notes"),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("aefi_patient_idx").on(t.patientId),
    index("aefi_facility_registered_at_idx").on(t.facilityId, t.aefiRegisteredAt),
    index("aefi_immunization_history_idx").on(t.immunizationHistoryId),
  ],
);

// HMIS 2.1 — feeding milestones section (one row per child immunization profile).
export const child_feeding_milestones = pgTable(
  "child_feeding_milestones",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    childImmunizationId: uuid("child_immunization_id")
      .notNull()
      .references(() => child_immunizations.id),
    breastfedWithin1h: boolean("breastfed_within_1h"),
    exclusiveBfMonths: integer("exclusive_bf_months"),
    complementaryFeedingStartAgeMonths: integer(
      "complementary_feeding_start_age_months",
    ),
    notes: text("notes"),
    recordedAt: timestamp("recorded_at").defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    uniqueIndex("child_feeding_milestones_unique").on(t.childImmunizationId),
  ],
);

export const growths = pgTable(
  "growths",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    date: timestamp("date").notNull(),
    weight: real("weight"),
    height: real("height"),
    muac: real("muac"),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    childImmunizationId: uuid("child_immunization_id").references(
      () => child_immunizations.id,
    ),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("growth_patient_id_idx").on(t.patientId),
    index("growth_facility_patient_idx").on(t.facilityId, t.patientId),
    index("growth_facility_patient_date_idx").on(
      t.facilityId,
      t.patientId,
      t.date,
    ),
  ],
);

// ============================================================
// SCHEDULING & NOTIFICATIONS
// ============================================================

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => users.id),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    facilityId: uuid("facility_id").references(() => health_facilities.id),
    // Optional link to the clinical visit this appointment was delivered
    // through. Nullable: an appointment may be scheduled before (or without) a
    // visit being created. Set once the consultation is tied to a visit so
    // analytics can correlate telehealth appointments with their encounter.
    visitId: uuid("visit_id").references(() => visits.id),
    date: date("date").notNull(),
    status: appointmentStatusEnum("status").default("scheduled").notNull(),
    service: varchar("service", { length: 255 }),
    consent: integer("consent").default(1),
    reason: text("reason"),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("appointment_doctor_id_idx").on(t.doctorId),
    index("appointment_patient_id_idx").on(t.patientId),
    index("appointment_visit_id_idx").on(t.visitId),
    index("appointment_date_idx").on(t.date),
  ],
);

export const telehealth_sessions = pgTable("telehealth_sessions", {
  id: uuid("id")
    .primaryKey()
    .notNull()
    .default(sql`gen_random_uuid()`),
  appointmentId: uuid("appointment_id")
    .notNull()
    .unique()
    .references(() => appointments.id),
  provider: varchar("provider", { length: 50 }),
  roomName: varchar("room_name", { length: 255 }),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  durationSeconds: integer("duration_seconds").default(0),
  jaasSessionId: varchar("jaas_session_id", { length: 255 }),
});

export const auscultation_sessions = pgTable(
  "auscultation_sessions",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => users.id),
    encounterId: uuid("encounter_id").references(() => encounters.id),
    visitId: uuid("visit_id").references(() => visits.id),
    appointmentId: uuid("appointment_id").references(() => appointments.id),
    provider: varchar("provider", { length: 50 })
      .notNull()
      .default("jitsi_jaas"),
    roomName: varchar("room_name", { length: 255 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    startedAt: timestamp("started_at"),
    endedAt: timestamp("ended_at"),
    durationSeconds: integer("duration_seconds").notNull().default(0),
    recordingAttachmentId: uuid("recording_attachment_id").references(
      () => attachments.id,
      { onDelete: "set null" },
    ),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("auscultation_session_facility_idx").on(t.facilityId),
    index("auscultation_session_facility_patient_idx").on(
      t.facilityId,
      t.patientId,
    ),
    index("auscultation_session_facility_doctor_idx").on(
      t.facilityId,
      t.doctorId,
    ),
    index("auscultation_session_appointment_idx").on(t.appointmentId),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    seen: boolean("seen").default(false).notNull(),
    module: varchar("module", { length: 100 }),
    moduleId: uuid("module_id"),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("notification_user_id_idx").on(t.userId),
  ],
);

export const sms_logs = pgTable(
  "sms_logs",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    scheduleDate: timestamp("schedule_date").notNull(),
    deliveryDate: timestamp("delivery_date"),
    smsBody: text("sms_body"),
    status: integer("status").default(0).notNull(),
    phone: varchar("phone", { length: 50 }),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("sms_log_patient_id_idx").on(t.patientId),
  ],
);

export const rosters = pgTable(
  "rosters",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    date: date("date", { mode: "string" }).notNull(),
    fromTime: varchar("from_time", { length: 50 }).notNull(),
    toTime: varchar("to_time", { length: 50 }).notNull(),
    service: varchar("service", { length: 255 }).notNull(),
    status: rosterStatusEnum("status").notNull().default("active"),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("roster_user_id_idx").on(t.userId),
    index("roster_facility_id_idx").on(t.facilityId),
    index("roster_date_idx").on(t.date),
  ],
);

// ============================================================
// FAMILY PLANNING
// ============================================================

export const family_plannings = pgTable(
  "family_plannings",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    serviceDate: date("service_date", { mode: "string" }).notNull(),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => visits.id),
    encounterId: uuid("encounter_id")
      .notNull()
      .references(() => encounters.id),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    serviceType: familyPlanningServiceTypeEnum("service_type").notNull(),
    serviceProviderId: uuid("service_provider_id").references(() => users.id),
    serviceProviderFirstName: varchar("service_provider_first_name", {
      length: 255,
    }),
    serviceProviderLastName: varchar("service_provider_last_name", {
      length: 255,
    }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedBy: uuid("updated_by").references(() => users.id),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by").references(() => users.id),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("family_planning_patient_id_idx").on(t.patientId),
    index("family_planning_visit_id_idx").on(t.visitId),
    index("family_planning_encounter_id_idx").on(t.encounterId),
    index("family_planning_facility_id_idx").on(t.facilityId),
    index("family_planning_facility_patient_service_date_idx").on(
      t.facilityId,
      t.patientId,
      t.serviceDate,
    ),
  ],
);

export const family_planning_olds = pgTable("family_planning_olds", {
  id: uuid("id")
    .primaryKey()
    .notNull()
    .default(sql`gen_random_uuid()`),
  previousDevice: familyPlanningDeviceEnum("previous_device"),
  continueSameDevice: boolean("continue_same_device"),
  discontinueReason: text("discontinue_reason"),
  discontinueReasonOther: text("discontinue_reason_other"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
  deletedBy: uuid("deleted_by").references(() => users.id),
  deletedAt: timestamp("deleted_at"),
});

export const family_planning_news = pgTable(
  "family_planning_news",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    familyPlanningId: uuid("family_planning_id")
      .notNull()
      .references(() => family_plannings.id),
    lastMenstrualPeriod: date("last_menstrual_period", { mode: "string" }),
    previousDeviceId: uuid("previous_device_id").references(
      () => family_planning_olds.id,
    ),
    devicePlanned: familyPlanningDeviceEnum("device_planned").notNull(),
    deviceUsed: familyPlanningDeviceEnum("device_used").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    deviceNotUsedReason: text("device_not_used_reason"),
    usageTimePeriod: fpUsageTimePeriodEnum("usage_time_period"),
    usageDate: date("usage_date", { mode: "string" }),
    followUpDate: date("follow_up_date", { mode: "string" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedBy: uuid("updated_by").references(() => users.id),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by").references(() => users.id),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    uniqueIndex("fpn_family_planning_id_unique").on(t.familyPlanningId),
    uniqueIndex("fpn_previous_device_id_unique").on(t.previousDeviceId),
  ],
);

export const family_planning_removals = pgTable(
  "family_planning_removals",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    familyPlanningId: uuid("family_planning_id")
      .notNull()
      .references(() => family_plannings.id),
    previousDeviceId: uuid("previous_device_id").references(
      () => family_planning_olds.id,
    ),
    lastMenstrualPeriod: date("last_menstrual_period", { mode: "string" }),
    removalDate: date("removal_date", { mode: "string" }),
    placeOfFpDeviceUsed: varchar("place_of_fp_device_used", {
      length: 255,
    }),
    otherHealthFacilityName: varchar("other_health_facility_name", {
      length: 255,
    }),
    removalReason: text("removal_reason"),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    deletedBy: uuid("deleted_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    uniqueIndex("fpr_family_planning_id_unique").on(t.familyPlanningId),
    uniqueIndex("fpr_previous_device_id_unique").on(t.previousDeviceId),
  ],
);

export const fp_hormonal_details = pgTable(
  "fp_hormonal_details",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    newFpId: uuid("new_fp_id")
      .notNull()
      .references(() => family_planning_news.id),
    swellingLegOrBreathShortness: boolean(
      "swelling_leg_or_breath_shortness",
    ).notNull(),
    painSwellingLegPregnancy: boolean("pain_swelling_leg_pregnancy").notNull(),
    regularMenstrualBleeding: boolean("regular_menstrual_bleeding").notNull(),
    menstruationBleedingAmount: boolean(
      "menstruation_bleeding_amount",
    ).notNull(),
    bleedingBetweenPeriods: boolean("bleeding_between_periods").notNull(),
    jaundice: boolean("jaundice").notNull(),
    diabetes: boolean("diabetes").notNull(),
    severeHeadache: boolean("severe_headache").notNull(),
    lumpOrSwellingBreast: boolean("lump_or_swelling_breast").notNull(),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
    deletedBy: uuid("deleted_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    uniqueIndex("fph_new_fp_id_unique").on(t.newFpId),
  ],
);

export const fp_iucd_details = pgTable(
  "fp_iucd_details",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    newFpId: uuid("new_fp_id")
      .notNull()
      .references(() => family_planning_news.id),
    lowerAbdominalPain: boolean("lower_abdominal_pain").notNull(),
    foulSmellingVaginalDischarge: boolean(
      "foul_smelling_vaginal_discharge",
    ).notNull(),
    treatedForReproductiveTractInfection: boolean(
      "treated_for_reproductive_tract_infection",
    ).notNull(),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
    deletedBy: uuid("deleted_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    uniqueIndex("fpi_new_fp_id_unique").on(t.newFpId),
  ],
);

// ============================================================
// RELATIONS
// ============================================================

export const systemLogsRelations = relations(system_logs, ({ one }) => ({
  user: one(users, {
    fields: [system_logs.userId],
    references: [users.id],
  }),
}));

export const provincesRelations = relations(provinces, ({ many }) => ({
  districts: many(districts),
}));

export const districtsRelations = relations(districts, ({ one, many }) => ({
  province: one(provinces, {
    fields: [districts.provinceId],
    references: [provinces.id],
  }),
  municipalities: many(municipalities),
}));

export const municipalitiesRelations = relations(
  municipalities,
  ({ one, many }) => ({
    district: one(districts, {
      fields: [municipalities.districtId],
      references: [districts.id],
    }),
    facilities: many(health_facilities),
    registries: many(health_facility_registries),
    patients: many(patients),
    users: many(users),
  }),
);

export const healthFacilitiesRelations = relations(
  health_facilities,
  ({ one, many }) => ({
    municipality: one(municipalities, {
      fields: [health_facilities.municipalityId],
      references: [municipalities.id],
    }),
    province: one(provinces, {
      fields: [health_facilities.provinceId],
      references: [provinces.id],
    }),
    district: one(districts, {
      fields: [health_facilities.districtId],
      references: [districts.id],
    }),
    users: many(users),
    patients: many(patients),
    visits: many(visits),
    pregnancies: many(pregnancies),
    child_immunizations: many(child_immunizations),
    appointments: many(appointments),
    rosters: many(rosters),
    family_plannings: many(family_plannings),
  }),
);

export const healthFacilityRegistriesRelations = relations(
  health_facility_registries,
  ({ one }) => ({
    municipality: one(municipalities, {
      fields: [health_facility_registries.municipalityId],
      references: [municipalities.id],
    }),

  }),
);

export const userRolesRelations = relations(user_roles, ({ many }) => ({
  users: many(users),
  assignments: many(user_role_assignments),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  person: one(persons, {
    fields: [users.personId],
    references: [persons.id],
  }),
  facility: one(health_facilities, {
    fields: [users.facilityId],
    references: [health_facilities.id],
  }),
  municipality: one(municipalities, {
    fields: [users.municipalityId],
    references: [municipalities.id],
  }),
  role: one(user_roles, {
    fields: [users.userRoleId],
    references: [user_roles.id],
  }),
  logs: many(system_logs),
  assignedPatients: many(patients, { relationName: "assignedUser" }),
  visitsAsDoctor: many(visits, { relationName: "visitDoctor" }),
  encountersAsDoctor: many(encounters, { relationName: "encounterDoctor" }),
  appointmentsAsDoctor: many(appointments, {
    relationName: "appointmentDoctor",
  }),
  passwordResets: many(password_resets),
  profile: many(user_profiles),
  roleAssignments: many(user_role_assignments),
  sessions: many(auth_sessions),
  practitioner: many(practitioners),
  auditEvents: many(audit_events),
  notifications: many(notifications),
  rosters: many(rosters, { relationName: "rosterUser" }),
  pregnanciesAsFchv: many(pregnancies, { relationName: "assignedFchv" }),
  fromCallRequests: many(call_requests, { relationName: "fromUser" }),
  toCallRequests: many(call_requests, { relationName: "toUser" }),
}));

export const passwordResetsRelations = relations(
  password_resets,
  ({ one }) => ({
    user: one(users, {
      fields: [password_resets.userId],
      references: [users.id],
    }),
  }),
);

export const patientsRelations = relations(patients, ({ many, one }) => ({
  person: one(persons, {
    fields: [patients.personId],
    references: [persons.id],
  }),
  facility: one(health_facilities, {
    fields: [patients.facilityId],
    references: [health_facilities.id],
  }),
  assignedUser: one(users, {
    fields: [patients.assignedUserId],
    references: [users.id],
    relationName: "assignedUser",
  }),
  visits: many(visits),
  encounters: many(encounters),
  appointments: many(appointments),
  consents: many(consents),
  patientIdentifiers: many(patient_identifiers),
  smsLogs: many(sms_logs),
  pregnancies: many(pregnancies),
  childImmunizations: many(child_immunizations),
  familyPlannings: many(family_plannings),
}));

export const personsRelations = relations(persons, ({ many }) => ({
  names: many(person_names),
  identifiers: many(person_identifiers),
  contacts: many(person_contacts),
  addresses: many(person_addresses),
  patients: many(patients),
  users: many(users),
  practitioners: many(practitioners),
  consents: many(consents),
  auditEvents: many(audit_events),
}));

export const personNamesRelations = relations(person_names, ({ one }) => ({
  person: one(persons, {
    fields: [person_names.personId],
    references: [persons.id],
  }),
}));

export const personIdentifiersRelations = relations(
  person_identifiers,
  ({ one }) => ({
    person: one(persons, {
      fields: [person_identifiers.personId],
      references: [persons.id],
    }),
  }),
);

export const personContactsRelations = relations(person_contacts, ({ one }) => ({
  person: one(persons, {
    fields: [person_contacts.personId],
    references: [persons.id],
  }),
}));

export const personAddressesRelations = relations(
  person_addresses,
  ({ one }) => ({
    person: one(persons, {
      fields: [person_addresses.personId],
      references: [persons.id],
    }),
    municipality: one(municipalities, {
      fields: [person_addresses.municipalityId],
      references: [municipalities.id],
    }),
    district: one(districts, {
      fields: [person_addresses.districtId],
      references: [districts.id],
    }),
    province: one(provinces, {
      fields: [person_addresses.provinceId],
      references: [provinces.id],
    }),
  }),
);

export const userProfilesRelations = relations(user_profiles, ({ one }) => ({
  user: one(users, {
    fields: [user_profiles.userId],
    references: [users.id],
  }),
}));

export const userRoleAssignmentsRelations = relations(
  user_role_assignments,
  ({ one }) => ({
    user: one(users, {
      fields: [user_role_assignments.userId],
      references: [users.id],
    }),
    role: one(user_roles, {
      fields: [user_role_assignments.roleId],
      references: [user_roles.id],
    }),
    facility: one(health_facilities, {
      fields: [user_role_assignments.facilityId],
      references: [health_facilities.id],
    }),
    municipality: one(municipalities, {
      fields: [user_role_assignments.municipalityId],
      references: [municipalities.id],
    }),
  }),
);

export const authSessionsRelations = relations(auth_sessions, ({ one }) => ({
  user: one(users, {
    fields: [auth_sessions.userId],
    references: [users.id],
  }),
}));

export const patientIdentifiersRelations = relations(
  patient_identifiers,
  ({ one }) => ({
    patient: one(patients, {
      fields: [patient_identifiers.patientId],
      references: [patients.id],
    }),
  }),
);

export const consentsRelations = relations(consents, ({ one }) => ({
  patient: one(patients, {
    fields: [consents.patientId],
    references: [patients.id],
  }),
  person: one(persons, {
    fields: [consents.personId],
    references: [persons.id],
  }),
  grantedByUser: one(users, {
    fields: [consents.grantedByUserId],
    references: [users.id],
  }),
}));

export const practitionersRelations = relations(practitioners, ({ one, many }) => ({
  person: one(persons, {
    fields: [practitioners.personId],
    references: [persons.id],
  }),
  user: one(users, {
    fields: [practitioners.userId],
    references: [users.id],
  }),
  roleAssignments: many(practitioner_role_assignments),
}));

export const practitionerRoleAssignmentsRelations = relations(
  practitioner_role_assignments,
  ({ one }) => ({
    practitioner: one(practitioners, {
      fields: [practitioner_role_assignments.practitionerId],
      references: [practitioners.id],
    }),
    facility: one(health_facilities, {
      fields: [practitioner_role_assignments.facilityId],
      references: [health_facilities.id],
    }),
    municipality: one(municipalities, {
      fields: [practitioner_role_assignments.municipalityId],
      references: [municipalities.id],
    }),
  }),
);

export const auditEventsRelations = relations(audit_events, ({ one }) => ({
  actorUser: one(users, {
    fields: [audit_events.actorUserId],
    references: [users.id],
  }),
  actorPerson: one(persons, {
    fields: [audit_events.actorPersonId],
    references: [persons.id],
  }),
  patient: one(patients, {
    fields: [audit_events.patientId],
    references: [patients.id],
  }),
  facility: one(health_facilities, {
    fields: [audit_events.facilityId],
    references: [health_facilities.id],
  }),
}));

export const visitsRelations = relations(visits, ({ one, many }) => ({
  patient: one(patients, {
    fields: [visits.patientId],
    references: [patients.id],
  }),
  facility: one(health_facilities, {
    fields: [visits.facilityId],
    references: [health_facilities.id],
  }),
  doctor: one(users, {
    fields: [visits.doctorId],
    references: [users.id],
    relationName: "visitDoctor",
  }),
  encounters: many(encounters),
  vitals: many(vitals),
  histories: many(histories),
  complaints: many(complaints),
  physicalExaminations: many(physical_examinations),
  provisionalDiagnoses: many(provisional_diagnoses),
  confirmDiagnoses: many(confirm_diagnoses),
  tests: many(tests),
  treatments: many(treatments),
  medications: many(medications),
  appointments: many(appointments),
}));

export const encountersRelations = relations(encounters, ({ one, many }) => ({
  visit: one(visits, {
    fields: [encounters.visitId],
    references: [visits.id],
  }),
  patient: one(patients, {
    fields: [encounters.patientId],
    references: [patients.id],
  }),
  facility: one(health_facilities, {
    fields: [encounters.facilityId],
    references: [health_facilities.id],
  }),
  doctor: one(users, {
    fields: [encounters.doctorId],
    references: [users.id],
    relationName: "encounterDoctor",
  }),
  vitals: many(vitals),
  histories: many(histories),
  complaints: many(complaints),
  physicalExaminations: many(physical_examinations),
  provisionalDiagnoses: many(provisional_diagnoses),
  confirmDiagnoses: many(confirm_diagnoses),
  tests: many(tests),
  treatments: many(treatments),
  medications: many(medications),
}));

export const vitalsRelations = relations(vitals, ({ one }) => ({
  visit: one(visits, {
    fields: [vitals.visitId],
    references: [visits.id],
  }),
  encounter: one(encounters, {
    fields: [vitals.encounterId],
    references: [encounters.id],
  }),
  creator: one(users, {
    fields: [vitals.createdBy],
    references: [users.id],
    relationName: "vitalCreator",
  }),
}));

export const historiesRelations = relations(histories, ({ one }) => ({
  visit: one(visits, {
    fields: [histories.visitId],
    references: [visits.id],
  }),
  encounter: one(encounters, {
    fields: [histories.encounterId],
    references: [encounters.id],
  }),
  creator: one(users, {
    fields: [histories.createdBy],
    references: [users.id],
    relationName: "historyCreator",
  }),
}));

export const complaintsRelations = relations(complaints, ({ one }) => ({
  visit: one(visits, {
    fields: [complaints.visitId],
    references: [visits.id],
  }),
  encounter: one(encounters, {
    fields: [complaints.encounterId],
    references: [encounters.id],
  }),
  patient: one(patients, {
    fields: [complaints.patientId],
    references: [patients.id],
  }),
  creator: one(users, {
    fields: [complaints.createdBy],
    references: [users.id],
    relationName: "complaintCreator",
  }),
}));

export const pregnanciesRelations = relations(pregnancies, ({ one, many }) => ({
  patient: one(patients, {
    fields: [pregnancies.patientId],
    references: [patients.id],
  }),
  visit: one(visits, {
    fields: [pregnancies.visitId],
    references: [visits.id],
  }),
  encounter: one(encounters, {
    fields: [pregnancies.encounterId],
    references: [encounters.id],
  }),
  facility: one(health_facilities, {
    fields: [pregnancies.facilityId],
    references: [health_facilities.id],
  }),
  fchv: one(users, {
    fields: [pregnancies.assignedFchvId],
    references: [users.id],
    relationName: "assignedFchv",
  }),
  creator: one(users, {
    fields: [pregnancies.createdBy],
    references: [users.id],
    relationName: "pregnancyCreator",
  }),
  updater: one(users, {
    fields: [pregnancies.updatedBy],
    references: [users.id],
    relationName: "pregnancyUpdater",
  }),
  antenatalCares: many(antenatal_cares),
  deliveries: many(deliveries),
  postnatalCares: many(postnatal_cares),
  homeMotherPnc: many(home_mother_postnatal_cares),
  homeBabyPnc: many(home_baby_postnatal_cares),
}));

export const antenatalCaresRelations = relations(antenatal_cares, ({ one }) => ({
  patient: one(patients, {
    fields: [antenatal_cares.patientId],
    references: [patients.id],
  }),
  pregnancy: one(pregnancies, {
    fields: [antenatal_cares.pregnancyId],
    references: [pregnancies.id],
  }),
  visit: one(visits, {
    fields: [antenatal_cares.visitId],
    references: [visits.id],
  }),
  encounter: one(encounters, {
    fields: [antenatal_cares.encounterId],
    references: [encounters.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  doctor: one(users, {
    fields: [appointments.doctorId],
    references: [users.id],
    relationName: "appointmentDoctor",
  }),
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id],
  }),
  facility: one(health_facilities, {
    fields: [appointments.facilityId],
    references: [health_facilities.id],
  }),
  visit: one(visits, {
    fields: [appointments.visitId],
    references: [visits.id],
  }),
  telehealthSession: one(telehealth_sessions, {
    fields: [appointments.id],
    references: [telehealth_sessions.appointmentId],
  }),
}));

export const telehealthSessionsRelations = relations(
  telehealth_sessions,
  ({ one }) => ({
    appointment: one(appointments, {
      fields: [telehealth_sessions.appointmentId],
      references: [appointments.id],
    }),
  }),
);

export const auscultationSessionsRelations = relations(
  auscultation_sessions,
  ({ one }) => ({
    facility: one(health_facilities, {
      fields: [auscultation_sessions.facilityId],
      references: [health_facilities.id],
    }),
    patient: one(patients, {
      fields: [auscultation_sessions.patientId],
      references: [patients.id],
    }),
    doctor: one(users, {
      fields: [auscultation_sessions.doctorId],
      references: [users.id],
    }),
    encounter: one(encounters, {
      fields: [auscultation_sessions.encounterId],
      references: [encounters.id],
    }),
    visit: one(visits, {
      fields: [auscultation_sessions.visitId],
      references: [visits.id],
    }),
    appointment: one(appointments, {
      fields: [auscultation_sessions.appointmentId],
      references: [appointments.id],
    }),
    recording: one(attachments, {
      fields: [auscultation_sessions.recordingAttachmentId],
      references: [attachments.id],
    }),
  }),
);

export const rostersRelations = relations(rosters, ({ one }) => ({
  user: one(users, {
    fields: [rosters.userId],
    references: [users.id],
    relationName: "rosterUser",
  }),
  facility: one(health_facilities, {
    fields: [rosters.facilityId],
    references: [health_facilities.id],
  }),
}));

export const familyPlanningsRelations = relations(
  family_plannings,
  ({ one, many }) => ({
    patient: one(patients, {
      fields: [family_plannings.patientId],
      references: [patients.id],
    }),
    facility: one(health_facilities, {
      fields: [family_plannings.facilityId],
      references: [health_facilities.id],
    }),
    visit: one(visits, {
      fields: [family_plannings.visitId],
      references: [visits.id],
    }),
    encounter: one(encounters, {
      fields: [family_plannings.encounterId],
      references: [encounters.id],
    }),
    news: many(family_planning_news),
    removals: many(family_planning_removals),
  }),
);

export const familyPlanningNewsRelations = relations(
  family_planning_news,
  ({ one }) => ({
    familyPlanning: one(family_plannings, {
      fields: [family_planning_news.familyPlanningId],
      references: [family_plannings.id],
    }),
    previousDevice: one(family_planning_olds, {
      fields: [family_planning_news.previousDeviceId],
      references: [family_planning_olds.id],
    }),
    hormonalDetails: one(fp_hormonal_details),
    iucdDetails: one(fp_iucd_details),
  }),
);

export const callRequestsRelations = relations(call_requests, ({ one }) => ({
  fromUser: one(users, {
    fields: [call_requests.fromUserId],
    references: [users.id],
    relationName: "fromUser",
  }),
  toUser: one(users, {
    fields: [call_requests.toUserId],
    references: [users.id],
    relationName: "toUser",
  }),
  patient: one(patients, {
    fields: [call_requests.patientId],
    references: [patients.id],
  }),
}));

// ============================================================
// CB-IMNCI (Community-Based Integrated Management of Neonatal
// and Childhood Illness)
// ============================================================

export const imnciPathwayEnum = pgEnum("imnci_pathway_enum", [
  "young_infant",
  "sick_child",
]);

export const imnciSeverityEnum = pgEnum("imnci_severity_enum", [
  "pink",
  "yellow",
  "green",
]);

export const imnciVisitStatusEnum = pgEnum("imnci_visit_status_enum", [
  "in_progress",
  "classified",
  "completed",
  "referred",
]);

export const imnciTreatmentItemStatusEnum = pgEnum(
  "imnci_treatment_item_status_enum",
  ["recommended", "confirmed", "overridden", "cancelled"],
);

export const imnciFollowUpStatusEnum = pgEnum("imnci_follow_up_status_enum", [
  "scheduled",
  "completed",
  "missed",
]);

export const imnciClassificationSourceEnum = pgEnum(
  "imnci_classification_source_enum",
  ["engine", "override"],
);

export const imnciBookletStatusEnum = pgEnum("imnci_booklet_status_enum", [
  "draft",
  "active",
  "retired",
]);

export const imnciActionKindEnum = pgEnum("imnci_action_kind_enum", [
  "drug",
  "referral",
  "counselling",
  "procedure",
]);

// ----- Reference (versioned booklet content) -----

export const imnci_chart_booklets = pgTable(
  "imnci_chart_booklets",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    facilityId: uuid("facility_id").references(() => health_facilities.id),
    municipalityId: uuid("municipality_id").references(
      () => municipalities.id,
    ),
    versionCode: varchar("version_code", { length: 100 }).notNull(),
    country: varchar("country", { length: 8 }).notNull().default("NP"),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    status: imnciBookletStatusEnum("status").default("active").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => [
    index("imnci_chart_booklets_facility_idx").on(t.facilityId),
    index("imnci_chart_booklets_municipality_idx").on(t.municipalityId),
    index("imnci_chart_booklets_status_idx").on(t.status),
  ],
);

export const imnci_questions = pgTable(
  "imnci_questions",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    bookletId: uuid("booklet_id")
      .notNull()
      .references(() => imnci_chart_booklets.id),
    key: varchar("key", { length: 128 }).notNull(),
    pathway: imnciPathwayEnum("pathway").notNull(),
    section: varchar("section", { length: 64 }).notNull(),
    promptKey: varchar("prompt_key", { length: 255 }).notNull(),
    prompts: jsonb("prompts").notNull(), // { en: string, ne: string }
    inputType: varchar("input_type", { length: 16 }).notNull(), // bool | int | enum | text
    options: jsonb("options"),
    validation: jsonb("validation"),
    displayOrder: integer("display_order").notNull().default(0),
  },
  (t) => [
    uniqueIndex("imnci_questions_booklet_key_idx").on(t.bookletId, t.key),
    index("imnci_questions_section_idx").on(t.bookletId, t.section),
  ],
);

export const imnci_classification_rules = pgTable(
  "imnci_classification_rules",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    bookletId: uuid("booklet_id")
      .notNull()
      .references(() => imnci_chart_booklets.id),
    pathway: imnciPathwayEnum("pathway").notNull(),
    section: varchar("section", { length: 64 }).notNull(),
    classificationCode: varchar("classification_code", { length: 64 }).notNull(),
    severity: imnciSeverityEnum("severity").notNull(),
    priority: integer("priority").notNull(),
    predicate: jsonb("predicate").notNull(),
    notes: text("notes"),
  },
  (t) => [
    index("imnci_classification_rules_booklet_section_idx").on(
      t.bookletId,
      t.section,
      t.priority,
    ),
    uniqueIndex("imnci_classification_rules_booklet_code_idx").on(
      t.bookletId,
      t.classificationCode,
    ),
  ],
);

export const imnci_treatment_rules = pgTable(
  "imnci_treatment_rules",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    bookletId: uuid("booklet_id")
      .notNull()
      .references(() => imnci_chart_booklets.id),
    classificationCode: varchar("classification_code", { length: 64 }).notNull(),
    actionKind: imnciActionKindEnum("action_kind").notNull(),
    drugCode: varchar("drug_code", { length: 64 }),
    doseTable: jsonb("dose_table"),
    durationDays: integer("duration_days"),
    followUpDays: integer("follow_up_days"),
    counsellingKey: varchar("counselling_key", { length: 128 }),
    sequence: integer("sequence").notNull().default(0),
  },
  (t) => [
    index("imnci_treatment_rules_booklet_code_idx").on(
      t.bookletId,
      t.classificationCode,
    ),
  ],
);

export const imnci_formulary = pgTable(
  "imnci_formulary",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    bookletId: uuid("booklet_id")
      .notNull()
      .references(() => imnci_chart_booklets.id),
    drugCode: varchar("drug_code", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    formulation: varchar("formulation", { length: 255 }),
    weightBandedDoses: jsonb("weight_banded_doses").notNull(),
    notes: text("notes"),
  },
  (t) => [
    uniqueIndex("imnci_formulary_booklet_drug_idx").on(t.bookletId, t.drugCode),
  ],
);

export const imnci_counselling_messages = pgTable(
  "imnci_counselling_messages",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    bookletId: uuid("booklet_id")
      .notNull()
      .references(() => imnci_chart_booklets.id),
    key: varchar("key", { length: 128 }).notNull(),
    classificationCode: varchar("classification_code", { length: 64 }),
    language: varchar("language", { length: 8 }).notNull(),
    body: text("body").notNull(),
  },
  (t) => [
    uniqueIndex("imnci_counselling_booklet_key_lang_idx").on(
      t.bookletId,
      t.key,
      t.language,
    ),
  ],
);

// ----- Per-visit clinical tables -----

export const imnci_visits = pgTable(
  "imnci_visits",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    encounterId: uuid("encounter_id")
      .notNull()
      .references(() => encounters.id),
    bookletId: uuid("booklet_id")
      .notNull()
      .references(() => imnci_chart_booklets.id),
    pathway: imnciPathwayEnum("pathway").notNull(),
    ageMonthsAtVisit: integer("age_months_at_visit").notNull(),
    weightKg: real("weight_kg"),
    tempC: real("temp_c"),
    muacMm: integer("muac_mm"),
    status: imnciVisitStatusEnum("status").default("in_progress").notNull(),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    classifiedAt: timestamp("classified_at"),
    completedAt: timestamp("completed_at"),
    startedByUserId: uuid("started_by_user_id").references(() => users.id),
    completedByUserId: uuid("completed_by_user_id").references(() => users.id),
  },
  (t) => [
    uniqueIndex("imnci_visits_encounter_idx").on(t.encounterId),
    index("imnci_visits_facility_patient_idx").on(t.facilityId, t.patientId),
    index("imnci_visits_facility_status_idx").on(t.facilityId, t.status),
  ],
);

export const imnci_assessment_answers = pgTable(
  "imnci_assessment_answers",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => imnci_visits.id),
    questionKey: varchar("question_key", { length: 128 }).notNull(),
    valueBool: boolean("value_bool"),
    valueInt: integer("value_int"),
    valueText: text("value_text"),
    answeredAt: timestamp("answered_at").defaultNow().notNull(),
    answeredByUserId: uuid("answered_by_user_id").references(() => users.id),
  },
  (t) => [
    index("imnci_answers_visit_key_idx").on(t.visitId, t.questionKey),
    index("imnci_answers_visit_answered_at_idx").on(t.visitId, t.answeredAt),
  ],
);

export const imnci_visit_classifications = pgTable(
  "imnci_visit_classifications",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => imnci_visits.id),
    classificationCode: varchar("classification_code", { length: 64 }).notNull(),
    severity: imnciSeverityEnum("severity").notNull(),
    section: varchar("section", { length: 64 }).notNull(),
    ruleIdSnapshot: uuid("rule_id_snapshot"),
    source: imnciClassificationSourceEnum("source").default("engine").notNull(),
    referralRequired: boolean("referral_required").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("imnci_visit_classifications_visit_idx").on(t.visitId),
  ],
);

export const imnci_treatment_plan_items = pgTable(
  "imnci_treatment_plan_items",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => imnci_visits.id),
    classificationCode: varchar("classification_code", { length: 64 }).notNull(),
    kind: imnciActionKindEnum("kind").notNull(),
    drugCode: varchar("drug_code", { length: 64 }),
    doseAmount: real("dose_amount"),
    doseUnit: varchar("dose_unit", { length: 32 }),
    frequency: varchar("frequency", { length: 64 }),
    durationDays: integer("duration_days"),
    counsellingKey: varchar("counselling_key", { length: 128 }),
    status: imnciTreatmentItemStatusEnum("status")
      .default("recommended")
      .notNull(),
    confirmedByUserId: uuid("confirmed_by_user_id").references(() => users.id),
    confirmedAt: timestamp("confirmed_at"),
    notes: text("notes"),
  },
  (t) => [
    index("imnci_plan_items_visit_idx").on(t.visitId),
    index("imnci_plan_items_visit_status_idx").on(t.visitId, t.status),
  ],
);

export const imnci_follow_ups = pgTable(
  "imnci_follow_ups",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => imnci_visits.id),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    dueOn: date("due_on", { mode: "string" }).notNull(),
    reason: varchar("reason", { length: 255 }).notNull(),
    status: imnciFollowUpStatusEnum("status").default("scheduled").notNull(),
    completedVisitId: uuid("completed_visit_id").references(
      () => imnci_visits.id,
    ),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (t) => [
    index("imnci_follow_ups_facility_due_idx").on(t.facilityId, t.dueOn),
    index("imnci_follow_ups_status_due_idx").on(t.status, t.dueOn),
  ],
);

export const imnci_referrals = pgTable(
  "imnci_referrals",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => imnci_visits.id),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    fromFacilityId: uuid("from_facility_id")
      .notNull()
      .references(() => health_facilities.id),
    toFacilityId: uuid("to_facility_id").references(() => health_facilities.id),
    reason: text("reason").notNull(),
    classifications: jsonb("classifications").notNull(),
    preReferralTreatmentGiven: jsonb("pre_referral_treatment_given"),
    referredAt: timestamp("referred_at").defaultNow().notNull(),
    referredByUserId: uuid("referred_by_user_id").references(() => users.id),
    outcome: varchar("outcome", { length: 64 }),
  },
  (t) => [
    index("imnci_referrals_facility_idx").on(t.facilityId),
    index("imnci_referrals_to_facility_idx").on(t.toFacilityId),
  ],
);

// ----- FCHV-specific tables -----

export const imnci_fchv_screenings = pgTable(
  "imnci_fchv_screenings",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    patientId: uuid("patient_id").references(() => patients.id),
    fchvUserId: uuid("fchv_user_id")
      .notNull()
      .references(() => users.id),
    visitedAt: timestamp("visited_at").defaultNow().notNull(),
    location: jsonb("location"),
    dangerSignsFound: jsonb("danger_signs_found").notNull(),
    referralRecommended: boolean("referral_recommended").default(false).notNull(),
    referralUrgency: varchar("referral_urgency", { length: 32 }),
    notes: text("notes"),
  },
  (t) => [
    index("imnci_fchv_screenings_facility_idx").on(t.facilityId),
    index("imnci_fchv_screenings_fchv_visited_idx").on(
      t.fchvUserId,
      t.visitedAt,
    ),
  ],
);

export const imnci_fchv_commodities_dispensed = pgTable(
  "imnci_fchv_commodities_dispensed",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    screeningId: uuid("screening_id")
      .notNull()
      .references(() => imnci_fchv_screenings.id),
    commodity: varchar("commodity", { length: 64 }).notNull(),
    quantity: real("quantity").notNull(),
    unit: varchar("unit", { length: 32 }).notNull(),
    batchNo: varchar("batch_no", { length: 64 }),
    dispensedAt: timestamp("dispensed_at").defaultNow().notNull(),
  },
  (t) => [
    index("imnci_fchv_commodities_screening_idx").on(t.screeningId),
  ],
);

// ----- IMNCI Relations -----

export const imnciChartBookletsRelations = relations(
  imnci_chart_booklets,
  ({ one, many }) => ({
    facility: one(health_facilities, {
      fields: [imnci_chart_booklets.facilityId],
      references: [health_facilities.id],
    }),
    municipality: one(municipalities, {
      fields: [imnci_chart_booklets.municipalityId],
      references: [municipalities.id],
    }),
    questions: many(imnci_questions),
    classificationRules: many(imnci_classification_rules),
    treatmentRules: many(imnci_treatment_rules),
    formulary: many(imnci_formulary),
    counselling: many(imnci_counselling_messages),
  }),
);

export const imnciQuestionsRelations = relations(imnci_questions, ({ one }) => ({
  booklet: one(imnci_chart_booklets, {
    fields: [imnci_questions.bookletId],
    references: [imnci_chart_booklets.id],
  }),
}));

export const imnciClassificationRulesRelations = relations(
  imnci_classification_rules,
  ({ one }) => ({
    booklet: one(imnci_chart_booklets, {
      fields: [imnci_classification_rules.bookletId],
      references: [imnci_chart_booklets.id],
    }),
  }),
);

export const imnciTreatmentRulesRelations = relations(
  imnci_treatment_rules,
  ({ one }) => ({
    booklet: one(imnci_chart_booklets, {
      fields: [imnci_treatment_rules.bookletId],
      references: [imnci_chart_booklets.id],
    }),
  }),
);

export const imnciFormularyRelations = relations(imnci_formulary, ({ one }) => ({
  booklet: one(imnci_chart_booklets, {
    fields: [imnci_formulary.bookletId],
    references: [imnci_chart_booklets.id],
  }),
}));

export const imnciCounsellingMessagesRelations = relations(
  imnci_counselling_messages,
  ({ one }) => ({
    booklet: one(imnci_chart_booklets, {
      fields: [imnci_counselling_messages.bookletId],
      references: [imnci_chart_booklets.id],
    }),
  }),
);

export const imnciVisitsRelations = relations(
  imnci_visits,
  ({ one, many }) => ({
    facility: one(health_facilities, {
      fields: [imnci_visits.facilityId],
      references: [health_facilities.id],
    }),
    patient: one(patients, {
      fields: [imnci_visits.patientId],
      references: [patients.id],
    }),
    encounter: one(encounters, {
      fields: [imnci_visits.encounterId],
      references: [encounters.id],
    }),
    booklet: one(imnci_chart_booklets, {
      fields: [imnci_visits.bookletId],
      references: [imnci_chart_booklets.id],
    }),
    startedBy: one(users, {
      fields: [imnci_visits.startedByUserId],
      references: [users.id],
      relationName: "imnciVisitStartedBy",
    }),
    completedBy: one(users, {
      fields: [imnci_visits.completedByUserId],
      references: [users.id],
      relationName: "imnciVisitCompletedBy",
    }),
    answers: many(imnci_assessment_answers),
    classifications: many(imnci_visit_classifications),
    planItems: many(imnci_treatment_plan_items),
    followUps: many(imnci_follow_ups, { relationName: "imnciFollowUpForVisit" }),
    referrals: many(imnci_referrals),
  }),
);

export const imnciAssessmentAnswersRelations = relations(
  imnci_assessment_answers,
  ({ one }) => ({
    visit: one(imnci_visits, {
      fields: [imnci_assessment_answers.visitId],
      references: [imnci_visits.id],
    }),
    answeredBy: one(users, {
      fields: [imnci_assessment_answers.answeredByUserId],
      references: [users.id],
    }),
  }),
);

export const imnciVisitClassificationsRelations = relations(
  imnci_visit_classifications,
  ({ one }) => ({
    visit: one(imnci_visits, {
      fields: [imnci_visit_classifications.visitId],
      references: [imnci_visits.id],
    }),
  }),
);

export const imnciTreatmentPlanItemsRelations = relations(
  imnci_treatment_plan_items,
  ({ one }) => ({
    visit: one(imnci_visits, {
      fields: [imnci_treatment_plan_items.visitId],
      references: [imnci_visits.id],
    }),
    confirmedBy: one(users, {
      fields: [imnci_treatment_plan_items.confirmedByUserId],
      references: [users.id],
    }),
  }),
);

export const imnciFollowUpsRelations = relations(imnci_follow_ups, ({ one }) => ({
  facility: one(health_facilities, {
    fields: [imnci_follow_ups.facilityId],
    references: [health_facilities.id],
  }),
  visit: one(imnci_visits, {
    fields: [imnci_follow_ups.visitId],
    references: [imnci_visits.id],
    relationName: "imnciFollowUpForVisit",
  }),
  patient: one(patients, {
    fields: [imnci_follow_ups.patientId],
    references: [patients.id],
  }),
  completedVisit: one(imnci_visits, {
    fields: [imnci_follow_ups.completedVisitId],
    references: [imnci_visits.id],
    relationName: "imnciFollowUpCompletedVisit",
  }),
}));

export const imnciReferralsRelations = relations(imnci_referrals, ({ one }) => ({
  facility: one(health_facilities, {
    fields: [imnci_referrals.facilityId],
    references: [health_facilities.id],
  }),
  visit: one(imnci_visits, {
    fields: [imnci_referrals.visitId],
    references: [imnci_visits.id],
  }),
  patient: one(patients, {
    fields: [imnci_referrals.patientId],
    references: [patients.id],
  }),
  fromFacility: one(health_facilities, {
    fields: [imnci_referrals.fromFacilityId],
    references: [health_facilities.id],
    relationName: "imnciReferralFromFacility",
  }),
  toFacility: one(health_facilities, {
    fields: [imnci_referrals.toFacilityId],
    references: [health_facilities.id],
    relationName: "imnciReferralToFacility",
  }),
  referredBy: one(users, {
    fields: [imnci_referrals.referredByUserId],
    references: [users.id],
  }),
}));

export const imnciFchvScreeningsRelations = relations(
  imnci_fchv_screenings,
  ({ one, many }) => ({
    facility: one(health_facilities, {
      fields: [imnci_fchv_screenings.facilityId],
      references: [health_facilities.id],
    }),
    patient: one(patients, {
      fields: [imnci_fchv_screenings.patientId],
      references: [patients.id],
    }),
    fchvUser: one(users, {
      fields: [imnci_fchv_screenings.fchvUserId],
      references: [users.id],
    }),
    commoditiesDispensed: many(imnci_fchv_commodities_dispensed),
  }),
);

export const imnciFchvCommoditiesDispensedRelations = relations(
  imnci_fchv_commodities_dispensed,
  ({ one }) => ({
    screening: one(imnci_fchv_screenings, {
      fields: [imnci_fchv_commodities_dispensed.screeningId],
      references: [imnci_fchv_screenings.id],
    }),
  }),
);
