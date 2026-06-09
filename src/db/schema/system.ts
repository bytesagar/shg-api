import {
  pgTable,
  varchar,
  integer,
  timestamp,
  text,
  boolean,
  real,
  index,
  jsonb,
  uuid,
  bigint,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  logLevelEnum,
} from "./enums";
import {
  users,
} from "./auth";
import {
  health_facilities,
} from "./facilities";
import {
  patients,
} from "./patient";
import {
  persons,
} from "./person";

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

// Audit trail for every outbound SMS (mock or real). Also the groundwork for
// future scheduled reminders: a row with `scheduleDate` set and
// `status = SMS_STATUS.PENDING` is a queued message a worker can pick up later.
// `status` is an integer code — see SMS_STATUS in src/modules/sms/sms.status.ts
// (0 = pending, 1 = sent, 2 = failed), preserved from the v1 schema.
export const systemLogsRelations = relations(system_logs, ({ one }) => ({
  user: one(users, {
    fields: [system_logs.userId],
    references: [users.id],
  }),
}));

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

export const migration_id_map = pgTable(
  "migration_id_map",
  {
    entity: varchar("entity", { length: 64 }).notNull(),
    v1Id: bigint("v1_id", { mode: "number" }).notNull(),
    v2Id: uuid("v2_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.entity, t.v1Id] })],
);
