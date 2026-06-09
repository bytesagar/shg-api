import {
  pgTable,
  varchar,
  integer,
  timestamp,
  boolean,
  uniqueIndex,
  index,
  uuid,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  bloodGroupEnum,
  casteEnum,
  genderEnum,
  personStatusEnum,
} from "./enums";
import {
  users,
} from "./auth";
import {
  districts,
  municipalities,
  provinces,
} from "./geography";
import {
  consents,
  patients,
} from "./patient";
import {
  practitioners,
} from "./practitioner";
import {
  audit_events,
} from "./system";

export const persons = pgTable(
  "persons",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    gender: genderEnum("gender"),
    bloodGroup: bloodGroupEnum("blood_group").default("unknown").notNull(),
    caste: casteEnum("caste"),
    birthDate: timestamp("birth_date"),
    deceasedAt: timestamp("deceased_at"),
    status: personStatusEnum("status").default("active").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [index("person_status_idx").on(t.status)],
);

export const person_identifiers = pgTable(
  "person_identifiers",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    personId: uuid("person_id")
      .notNull()
      .references(() => persons.id),
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
    index("person_identifier_person_id_idx").on(t.personId),
    uniqueIndex("person_identifier_system_value_unique").on(t.system, t.value),
  ],
);

export const person_names = pgTable(
  "person_names",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    personId: uuid("person_id")
      .notNull()
      .references(() => persons.id),
    use: varchar("use", { length: 50 }),
    family: varchar("family", { length: 255 }),
    given: varchar("given", { length: 255 }),
    middle: varchar("middle", { length: 255 }),
    prefix: varchar("prefix", { length: 50 }),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => [
    index("person_name_person_id_idx").on(t.personId),
    index("person_name_primary_idx").on(t.personId, t.isPrimary),
  ],
);

export const person_contacts = pgTable(
  "person_contacts",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    personId: uuid("person_id")
      .notNull()
      .references(() => persons.id),
    system: varchar("system", { length: 20 }).notNull(),
    use: varchar("use", { length: 50 }),
    rank: integer("rank"),
    value: varchar("value", { length: 255 }).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => [
    index("person_contact_person_id_idx").on(t.personId),
    index("person_contact_system_value_idx").on(t.system, t.value),
    index("person_contact_primary_idx").on(t.personId, t.system, t.isPrimary),
  ],
);

export const person_addresses = pgTable(
  "person_addresses",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    personId: uuid("person_id")
      .notNull()
      .references(() => persons.id),
    use: varchar("use", { length: 50 }),
    line1: varchar("line1", { length: 255 }),
    line2: varchar("line2", { length: 255 }),
    municipality: varchar("municipality", { length: 255 }),
    district: varchar("district", { length: 255 }),
    province: varchar("province", { length: 255 }),
    municipalityId: uuid("municipality_id").references(() => municipalities.id),
    districtId: uuid("district_id").references(() => districts.id),
    provinceId: uuid("province_id").references(() => provinces.id),
    ward: integer("ward"),
    postalCode: varchar("postal_code", { length: 20 }),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => [
    index("person_address_person_id_idx").on(t.personId),
    index("person_address_municipality_id_idx").on(t.municipalityId),
    index("person_address_district_id_idx").on(t.districtId),
    index("person_address_province_id_idx").on(t.provinceId),
  ],
);

export const personsRelations = relations(persons, ({ many }) => ({
  names: many(person_names),
  identifiers: many(person_identifiers),
  contacts: many(person_contacts),
  addresses: many(person_addresses),
  patients: many(patients),
  users: many(users),
  practitioners: many(practitioners),
  consents: many(consents),
  auditEvents: many(audit_events),
}));

export const personNamesRelations = relations(person_names, ({ one }) => ({
  person: one(persons, {
    fields: [person_names.personId],
    references: [persons.id],
  }),
}));

export const personIdentifiersRelations = relations(
  person_identifiers,
  ({ one }) => ({
    person: one(persons, {
      fields: [person_identifiers.personId],
      references: [persons.id],
    }),
  }),
);

export const personContactsRelations = relations(person_contacts, ({ one }) => ({
  person: one(persons, {
    fields: [person_contacts.personId],
    references: [persons.id],
  }),
}));

export const personAddressesRelations = relations(
  person_addresses,
  ({ one }) => ({
    person: one(persons, {
      fields: [person_addresses.personId],
      references: [persons.id],
    }),
    municipality: one(municipalities, {
      fields: [person_addresses.municipalityId],
      references: [municipalities.id],
    }),
    district: one(districts, {
      fields: [person_addresses.districtId],
      references: [districts.id],
    }),
    province: one(provinces, {
      fields: [person_addresses.provinceId],
      references: [provinces.id],
    }),
  }),
);
