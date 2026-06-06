import {
  pgTable,
  varchar,
  date,
  timestamp,
  text,
  boolean,
  uniqueIndex,
  index,
  uuid,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  familyPlanningDeviceEnum,
  familyPlanningServiceTypeEnum,
  fpUsageTimePeriodEnum,
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
