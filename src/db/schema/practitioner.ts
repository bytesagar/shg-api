import {
  pgTable,
  varchar,
  timestamp,
  boolean,
  index,
  uuid,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  users,
} from "./auth";
import {
  health_facilities,
} from "./facilities";
import {
  municipalities,
} from "./geography";
import {
  persons,
} from "./person";

export const practitioners = pgTable(
  "practitioners",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    personId: uuid("person_id")
      .notNull()
      .references(() => persons.id),
    userId: uuid("user_id").references(() => users.id),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => [index("practitioner_person_id_idx").on(t.personId)],
);

export const practitioner_role_assignments = pgTable(
  "practitioner_role_assignments",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    practitionerId: uuid("practitioner_id")
      .notNull()
      .references(() => practitioners.id),
    facilityId: uuid("facility_id").references(() => health_facilities.id),
    municipalityId: uuid("municipality_id").references(() => municipalities.id),
    roleCode: varchar("role_code", { length: 100 }).notNull(),
    specialty: varchar("specialty", { length: 255 }),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => [
    index("practitioner_role_assignment_practitioner_id_idx").on(t.practitionerId),
    index("practitioner_role_assignment_facility_id_idx").on(t.facilityId),
    index("practitioner_role_assignment_role_active_idx").on(t.roleCode, t.active),
  ],
);

export const practitionersRelations = relations(practitioners, ({ one, many }) => ({
  person: one(persons, {
    fields: [practitioners.personId],
    references: [persons.id],
  }),
  user: one(users, {
    fields: [practitioners.userId],
    references: [users.id],
  }),
  roleAssignments: many(practitioner_role_assignments),
}));

export const practitionerRoleAssignmentsRelations = relations(
  practitioner_role_assignments,
  ({ one }) => ({
    practitioner: one(practitioners, {
      fields: [practitioner_role_assignments.practitionerId],
      references: [practitioners.id],
    }),
    facility: one(health_facilities, {
      fields: [practitioner_role_assignments.facilityId],
      references: [health_facilities.id],
    }),
    municipality: one(municipalities, {
      fields: [practitioner_role_assignments.municipalityId],
      references: [municipalities.id],
    }),
  }),
);
