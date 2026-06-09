import {
  pgTable,
  varchar,
  integer,
  date,
  timestamp,
  text,
  index,
  uuid,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  appointmentStatusEnum,
  callRequestStatusEnum,
  rosterStatusEnum,
} from "./enums";
import {
  users,
} from "./auth";
import {
  visits,
} from "./clinical";
import {
  health_facilities,
} from "./facilities";
import {
  patients,
} from "./patient";

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

    visitId: uuid("visit_id").references(() => visits.id),
    date: date("date").notNull(),

    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
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
