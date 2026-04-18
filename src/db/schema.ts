import {
  pgTable,
  serial,
  varchar,
  integer,
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
});

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
    firstName: varchar("first_name", { length: 255 }).notNull(),
    lastName: varchar("last_name", { length: 255 }).notNull(),
    password: varchar("password", { length: 255 }).notNull(),
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

// ============================================================
// PATIENT
// ============================================================

export const patients = pgTable(
  "patients",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    patientId: varchar("patient_id", { length: 100 }).notNull(),
    name: varchar("name", { length: 255 }),
    firstName: varchar("first_name", { length: 255 }),
    lastName: varchar("last_name", { length: 255 }),
    middleName: varchar("middle_name", { length: 255 }),
    caste: casteEnum("caste").notNull(),
    age: integer("age").notNull(),
    ageUnit: ageUnitEnum("age_unit").default("years").notNull(),
    dob: timestamp("dob"),
    gender: genderEnum("gender").notNull(),
    province: varchar("province", { length: 255 }).notNull(),
    district: varchar("district", { length: 255 }).notNull(),
    palika: varchar("palika", { length: 255 }).notNull(),
    provinceId: uuid("province_id"),
    districtId: uuid("district_id"),
    municipalityId: uuid("municipality_id").references(() => municipalities.id),
    ward: integer("ward").notNull(),
    phoneNumber: varchar("phone_number", { length: 50 }).notNull(),
    service: varchar("service", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
    nationalId: varchar("national_id", { length: 100 }),
    nhisNumber: varchar("nhis_number", { length: 100 }),
    facilityId: uuid("facility_id").references(() => health_facilities.id),
    assignedUserId: uuid("assigned_user_id").references(() => users.id),
    status: patientStatusEnum("status").default("active").notNull(),
    education: varchar("education", { length: 255 }),
    occupation: varchar("occupation", { length: 255 }),
    otherOccupation: varchar("other_occupation", { length: 255 }),
    spouseName: varchar("spouse_name", { length: 255 }),
    childrenMale: integer("children_male"),
    childrenFemale: integer("children_female"),
  },
  (t) => [
    uniqueIndex("patient_patient_id_unique").on(
      t.patientId,
    ),
    index("patient_facility_id_idx").on(t.facilityId),
    index("patient_municipality_id_idx").on(t.municipalityId),
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
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    deletedBy: uuid("deleted_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("vital_visit_id_idx").on(t.visitId),
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
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    deletedBy: uuid("deleted_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("history_visit_id_idx").on(t.visitId),
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
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    deletedBy: uuid("deleted_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("test_visit_id_idx").on(t.visitId),
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
    firstVisit: timestamp("first_visit").notNull(),
    gravida: varchar("gravida", { length: 50 }).notNull(),
    para: varchar("para", { length: 50 }),
    lastMenstruationPeriod: timestamp("last_menstruation_period"),
    expectedDeliveryDate: timestamp("expected_delivery_date"),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    facilityId: uuid("facility_id").references(() => health_facilities.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
    assignedFchvId: uuid("assigned_fchv_id").references(() => users.id),
  },
  (t) => [
    index("pregnancy_patient_id_idx").on(t.patientId),
  ],
);

export const antenatal_cares = pgTable(
  "antenatal_cares",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    ancVisitDate: timestamp("anc_visit_date"),
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
    nextVisitSchedule: timestamp("next_visit_schedule"),
    ironTablet: integer("iron_tablet"),
    albendazole: integer("albendazole"),
    tdVaccination: varchar("td_vaccination", { length: 255 }),
    obstructiveComplications: text("obstructive_complications"),
    obstructiveComplicationsOther: text("obstructive_complications_other"),
    dangerSign: text("danger_sign"),
    dangerSignOther: text("danger_sign_other"),
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
  ],
);

export const deliveries = pgTable(
  "deliveries",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    deliveryDate: timestamp("delivery_date"),
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
    visitDate: timestamp("visit_date").notNull(),
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
    date: timestamp("date").notNull(),
    status: appointmentStatusEnum("status").default("scheduled").notNull(),
    service: varchar("service", { length: 255 }),
    consent: integer("consent").default(1),
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
  durationSeconds: integer("duration_seconds").default(0),
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
    serviceDate: timestamp("service_date").notNull(),
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
    index("family_planning_facility_id_idx").on(t.facilityId),
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
    lastMenstrualPeriod: timestamp("last_menstrual_period"),
    previousDeviceId: uuid("previous_device_id").references(
      () => family_planning_olds.id,
    ),
    devicePlanned: familyPlanningDeviceEnum("device_planned").notNull(),
    deviceUsed: familyPlanningDeviceEnum("device_used").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    deviceNotUsedReason: text("device_not_used_reason"),
    usageTimePeriod: fpUsageTimePeriodEnum("usage_time_period"),
    usageDate: timestamp("usage_date"),
    followUpDate: timestamp("follow_up_date"),
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
    uniqueIndex("fpn_family_planning_id_unique").on(
      t.familyPlanningId,
    ),
    uniqueIndex("fpn_previous_device_id_unique").on(
      t.previousDeviceId,
    ),
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
    lastMenstrualPeriod: timestamp("last_menstrual_period"),
    removalDate: timestamp("removal_date").notNull(),
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
    uniqueIndex("fpr_family_planning_id_unique").on(
      t.familyPlanningId,
    ),
    uniqueIndex("fpr_previous_device_id_unique").on(
      t.previousDeviceId,
    ),
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
}));

export const usersRelations = relations(users, ({ one, many }) => ({
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
  appointmentsAsDoctor: many(appointments, {
    relationName: "appointmentDoctor",
  }),
  passwordResets: many(password_resets),
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
  municipality: one(municipalities, {
    fields: [patients.municipalityId],
    references: [municipalities.id],
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
  appointments: many(appointments),
  smsLogs: many(sms_logs),
  pregnancies: many(pregnancies),
  childImmunizations: many(child_immunizations),
  familyPlannings: many(family_plannings),
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
  facility: one(health_facilities, {
    fields: [pregnancies.facilityId],
    references: [health_facilities.id],
  }),
  fchv: one(users, {
    fields: [pregnancies.assignedFchvId],
    references: [users.id],
    relationName: "assignedFchv",
  }),
  antenatalCares: many(antenatal_cares),
  deliveries: many(deliveries),
  postnatalCares: many(postnatal_cares),
  homeMotherPnc: many(home_mother_postnatal_cares),
  homeBabyPnc: many(home_baby_postnatal_cares),
}));

export const antenatalCaresRelations = relations(
  antenatal_cares,
  ({ one }) => ({
    patient: one(patients, {
      fields: [antenatal_cares.patientId],
      references: [patients.id],
    }),
    pregnancy: one(pregnancies, {
      fields: [antenatal_cares.pregnancyId],
      references: [pregnancies.id],
    }),
  }),
);

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
