import {
  pgTable,
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
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  users,
} from "./auth";
import {
  encounters,
  visits,
  vitals,
} from "./clinical";
import {
  health_facilities,
} from "./facilities";
import {
  municipalities,
} from "./geography";
import {
  patients,
} from "./patient";

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

// ----- IMNCI offline-first record archive -----
//
// Stores the JSON blob the frontend's Dexie outbox submits per IMNCI
// register entry. Coexists with the visit-centric tables above — those
// remain the source of truth for the structured rule-engine flow; this
// table is the per-submission archive for the form the field worker
// fills offline.
//
// Idempotency: the `id` is the client-generated UUID from the outbox.
// Re-syncing the same record (e.g. after an edit) upserts on `id` so
// retries don't duplicate rows.
export const imnci_records = pgTable(
  "imnci_records",
  {
    id: uuid("id").primaryKey().notNull(),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    visitId: uuid("visit_id").references(() => visits.id),
    encounterId: uuid("encounter_id").references(() => encounters.id),
    // "under-2-months" | "2-months-to-5-years" — kept as varchar instead
    // of an enum so the frontend's union can evolve without a backend
    // migration.
    ageBand: varchar("age_band", { length: 32 }).notNull(),
    // The full per-band form payload (registration, vitals, signs,
    // classification, treatment, counselling, outcome, …). Shape varies
    // by ageBand; jsonb lets us index later if needed.
    values: jsonb("values").notNull(),
    // Client-side timestamps preserved verbatim so reports can show the
    // moment the clinician submitted, even if sync was delayed by hours.
    clientCreatedAt: timestamp("client_created_at", {
      withTimezone: true,
    }).notNull(),
    clientUpdatedAt: timestamp("client_updated_at", {
      withTimezone: true,
    }).notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    // Server timestamps.
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("imnci_records_facility_patient_idx").on(t.facilityId, t.patientId),
    index("imnci_records_facility_patient_band_idx").on(
      t.facilityId,
      t.patientId,
      t.ageBand,
    ),
    index("imnci_records_facility_updated_idx").on(t.facilityId, t.updatedAt),
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

export const imnciRecordsRelations = relations(imnci_records, ({ one }) => ({
  facility: one(health_facilities, {
    fields: [imnci_records.facilityId],
    references: [health_facilities.id],
  }),
  patient: one(patients, {
    fields: [imnci_records.patientId],
    references: [patients.id],
  }),
  visit: one(visits, {
    fields: [imnci_records.visitId],
    references: [visits.id],
  }),
  encounter: one(encounters, {
    fields: [imnci_records.encounterId],
    references: [encounters.id],
  }),
  createdBy: one(users, {
    fields: [imnci_records.createdByUserId],
    references: [users.id],
  }),
}));

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

// ============================================================
// MIGRATION BOOKKEEPING (v1 -> v2 ETL)
// ============================================================

// Bidirectional registry mapping every v1 integer primary key to the v2 uuid
// it became. Persisted (not in-memory) so the migration is idempotent and
// resumable: each step checks the map and skips already-migrated rows, and a
// crashed run can be re-started. Also doubles as the audit/debug trail of
// "which v2 row came from which v1 row". Keyed by (entity, v1_id).
