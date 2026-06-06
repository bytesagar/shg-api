import {
  pgTable,
  varchar,
  integer,
  date,
  timestamp,
  boolean,
  uniqueIndex,
  index,
  uuid,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  consentStatusEnum,
  patientStatusEnum,
} from "./enums";
import {
  appointments,
} from "./appointments";
import {
  users,
} from "./auth";
import {
  attachments,
  encounters,
  visits,
} from "./clinical";
import {
  health_facilities,
} from "./facilities";
import {
  family_plannings,
} from "./family-planning";
import {
  child_immunizations,
} from "./immunization";
import {
  pregnancies,
} from "./maternal-health";
import {
  persons,
} from "./person";
import {
  sms_logs,
} from "./sms";

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
    photoAttachmentId: uuid("photo_attachment_id").references(
      () => attachments.id,
      { onDelete: "set null" },
    ),
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
