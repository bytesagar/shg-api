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

export const pregnancyStatusEnum = pgEnum("pregnancy_status_enum", [
  "active",
  "ended",
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

export const health_facilities = pgTable("health_facilities", {
  id: uuid("id")
    .primaryKey()
    .notNull()
    .default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  ward: varchar("ward", { length: 100 }).notNull(),
  palika: varchar("palika", { length: 255 }).notNull(),
  district: varchar("district", { length: 255 }).notNull(),
  province: varchar("province", { length: 255 }).notNull(),
  provinceId: uuid("province_id"),
  districtId: uuid("district_id"),
  municipalityId: uuid("municipality_id").references(() => municipalities.id),
  inchargeName: varchar("incharge_name", { length: 255 }).notNull(),
  hfCode: varchar("hf_code", { length: 100 }),
  authorityLevel: varchar("authority_level", { length: 100 }),
  authority: varchar("authority", { length: 255 }),
  ownership: varchar("ownership", { length: 255 }),
  facilityType: varchar("facility_type", { length: 100 }),
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
    ward: integer("ward"),
    postalCode: varchar("postal_code", { length: 20 }),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => [index("person_address_person_id_idx").on(t.personId)],
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
    date: timestamp("date").notNull(),
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
  },
  (t) => [
    index("antenatal_care_patient_id_idx").on(t.patientId),
    index("antenatal_care_pregnancy_id_idx").on(t.pregnancyId),
    index("antenatal_care_visit_id_idx").on(t.visitId),
    index("antenatal_care_encounter_id_idx").on(t.encounterId),
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
  },
  (t) => [
    index("delivery_patient_id_idx").on(t.patientId),
    index("delivery_pregnancy_id_idx").on(t.pregnancyId),
    index("delivery_visit_id_idx").on(t.visitId),
    index("delivery_encounter_id_idx").on(t.encounterId),
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
  },
  (t) => [
    index("postnatal_care_patient_id_idx").on(t.patientId),
    index("postnatal_care_pregnancy_id_idx").on(t.pregnancyId),
    index("postnatal_care_patient_visit_date_idx").on(t.patientId, t.visitDate),
    index("postnatal_care_visit_id_idx").on(t.visitId),
    index("postnatal_care_encounter_id_idx").on(t.encounterId),
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
// CHILD IMMUNIZATION
// ============================================================

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
    childImmunizationId: uuid("child_immunization_id")
      .notNull()
      .references(() => child_immunizations.id),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("immunization_history_patient_id_idx").on(t.patientId),
    index("immunization_history_child_immunization_id_idx").on(
      t.childImmunizationId,
    ),
    index("immunization_history_patient_date_idx").on(t.patientId, t.date),
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

/** Dedupe JaaS webhook deliveries (same idempotencyKey = duplicate). */
export const jaas_webhook_idempotency = pgTable("jaas_webhook_idempotency", {
  idempotencyKey: text("idempotency_key").primaryKey().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
    date: timestamp("date").notNull(),
    fromTime: varchar("from_time", { length: 50 }).notNull(),
    toTime: varchar("to_time", { length: 50 }).notNull(),
    service: varchar("service", { length: 255 }).notNull(),
    status: integer("status").default(0).notNull(),
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
