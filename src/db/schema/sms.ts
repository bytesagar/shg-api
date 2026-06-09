import {
  pgTable,
  varchar,
  integer,
  timestamp,
  text,
  index,
  uuid,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  users,
} from "./auth";
import {
  health_facilities,
} from "./facilities";
import {
  patients,
} from "./patient";

export const sms_logs = pgTable(
  "sms_logs",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    // Tenant scope column (see FacilityRepository). Always populated on write.
    facilityId: uuid("facility_id").references(() => health_facilities.id),
    // Nullable: not every SMS targets a patient (e.g. future staff/system SMS).
    patientId: uuid("patient_id").references(() => patients.id),
    // Nullable: null for immediate sends, set for queued/scheduled reminders.
    scheduleDate: timestamp("schedule_date"),
    deliveryDate: timestamp("delivery_date"),
    smsBody: text("sms_body"),
    // Which template produced this message (null for ad-hoc/free-text sends).
    templateKey: varchar("template_key", { length: 64 }),
    status: integer("status").default(0).notNull(),
    phone: varchar("phone", { length: 50 }),
    // Provider name + provider-side id + last error, for delivery diagnostics.
    provider: varchar("provider", { length: 32 }),
    providerMessageId: varchar("provider_message_id", { length: 255 }),
    error: text("error"),
    sentAt: timestamp("sent_at"),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("sms_log_patient_id_idx").on(t.patientId),
    index("sms_log_facility_id_idx").on(t.facilityId),
    index("sms_log_status_idx").on(t.status),
    index("sms_log_schedule_date_idx").on(t.scheduleDate),
  ],
);
