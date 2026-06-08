import {
  pgTable,
  varchar,
  integer,
  date,
  timestamp,
  text,
  boolean,
  real,
  uniqueIndex,
  index,
  uuid,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  durationUnitEnum,
  severityEnum,
  testCategoryEnum,
  visitStatusEnum,
} from "./enums";
import {
  appointments,
} from "./appointments";
import {
  users,
} from "./auth";
import {
  health_facilities,
} from "./facilities";
import {
  child_immunizations,
} from "./immunization";
import {
  patients,
} from "./patient";

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
    spo2: integer("spo2"),
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

/**
 * Global medicine registry (reference catalog); not facility-scoped.
 * Curated by admins under Settings. `isDefault` marks system/seeded entries
 * shipped pre-loaded, distinct from admin-added custom ones.
 *
 * Natural identity is the composite (medicineName, medicineForm, strength) —
 * the same name can legitimately appear with different forms/strengths
 * ("Acyclovir TABLET 200mg" vs "Acyclovir SYRUP 200mg/5ml"). Form and strength
 * are NOT NULL with default '' so Postgres treats blanks consistently in the
 * unique check (NULLs would be treated as distinct, breaking dedup).
 */
/**
 * Reference catalog of lab tests offered by the system. Seeded from
 * data/lab-tests.json (HMIS-aligned PATHOLOGY / RADIOLOGY list). The
 * frontend settings page reads from here; future per-visit `tests`
 * rows can FK into this catalog by id once an FK is needed.
 */
export const lab_tests = pgTable(
  "lab_tests",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 255 }).notNull(),
    /** PATHOLOGY | RADIOLOGY (HMIS service categorisation). */
    category: varchar("category", { length: 64 }).notNull(),
    /**
     * Optional canonical report-template key (e.g. HEMATOLOGICAL_TEST).
     * Nullable because some catalog entries — many radiology ones —
     * don't have a per-template form yet.
     */
    reportTemplate: varchar("report_template", { length: 64 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    // Same test name can legitimately appear under both PATHOLOGY and
    // RADIOLOGY (e.g. some imaging vs blood tests share names).
    uniqueIndex("lab_tests_name_category_uidx").on(t.name, t.category),
    index("lab_tests_category_idx").on(t.category),
  ],
);

export const medicines = pgTable(
  "medicines",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    medicineName: varchar("medicine_name", { length: 500 }).notNull(),
    medicineForm: varchar("medicine_form", { length: 100 }).notNull().default(""), // TABLET, CAPSULE, SYRUP...
    strength: varchar("strength", { length: 255 }).notNull().default(""),
    unit: varchar("unit", { length: 100 }),
    dose: varchar("dose", { length: 255 }),
    frequency: varchar("frequency", { length: 100 }), // OD, BD, TDS...
    route: varchar("route", { length: 100 }), // PO, IV...
    medicineTime: varchar("medicine_time", { length: 100 }), // BEFORE_FOOD, AFTER_FOOD
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    deletedAt: timestamp("deleted_at"),
    deletedBy: uuid("deleted_by").references(() => users.id),
  },
  (t) => [
    uniqueIndex("medicines_name_form_strength_uidx").on(
      t.medicineName,
      t.medicineForm,
      t.strength,
    ),
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
