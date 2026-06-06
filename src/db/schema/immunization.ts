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
  jsonb,
  uuid,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  aefiOutcomeEnum,
  aefiSeverityEnum,
  immunizationModeEnum,
  vaccineCategoryEnum,
  vaccineRouteEnum,
  vaccineSiteEnum,
} from "./enums";
import {
  users,
} from "./auth";
import {
  encounters,
  visits,
} from "./clinical";
import {
  health_facilities,
} from "./facilities";
import {
  patients,
} from "./patient";

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
