import {
  pgTable,
  varchar,
  integer,
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
  authSessionStatusEnum,
  userAccountStatusEnum,
  userRoleEnum,
} from "./enums";
import {
  appointments,
  call_requests,
  rosters,
} from "./appointments";
import {
  encounters,
  visits,
} from "./clinical";
import {
  health_facilities,
} from "./facilities";
import {
  municipalities,
} from "./geography";
import {
  pregnancies,
} from "./maternal-health";
import {
  patients,
} from "./patient";
import {
  persons,
} from "./person";
import {
  practitioners,
} from "./practitioner";
import {
  audit_events,
  notifications,
  system_logs,
} from "./system";

export const user_roles = pgTable("user_roles", {
  id: uuid("id")
    .primaryKey()
    .notNull()
    .default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  permissions: text("permissions")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
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
    avatarUrl: varchar("avatar_url", { length: 500 }),
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

export const user_facility_affiliations = pgTable(
  "user_facility_affiliations",
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
    roleId: uuid("role_id").references(() => user_roles.id),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => [
    index("user_facility_affiliation_user_id_idx").on(t.userId),
    index("user_facility_affiliation_facility_id_idx").on(t.facilityId),
    uniqueIndex("user_facility_affiliation_unique").on(t.userId, t.facilityId),
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
