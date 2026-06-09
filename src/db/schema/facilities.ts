import {
  pgTable,
  varchar,
  integer,
  timestamp,
  text,
  uniqueIndex,
  index,
  jsonb,
  uuid,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  ecologicalZoneEnum,
} from "./enums";
import {
  appointments,
  rosters,
} from "./appointments";
import {
  users,
} from "./auth";
import {
  visits,
} from "./clinical";
import {
  family_plannings,
} from "./family-planning";
import {
  districts,
  municipalities,
  provinces,
} from "./geography";
import {
  child_immunizations,
} from "./immunization";
import {
  pregnancies,
} from "./maternal-health";
import {
  patients,
} from "./patient";

export const health_facilities = pgTable(
  "health_facilities",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 255 }).notNull(),
    address: text("address"),
    phone: varchar("phone", { length: 50 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    ward: varchar("ward", { length: 100 }).notNull(),
    palika: varchar("palika", { length: 255 }).notNull(),
    district: varchar("district", { length: 255 }).notNull(),
    province: varchar("province", { length: 255 }).notNull(),
    provinceId: uuid("province_id").references(() => provinces.id),
    districtId: uuid("district_id").references(() => districts.id),
    municipalityId: uuid("municipality_id").references(() => municipalities.id),
    inchargeName: varchar("incharge_name", { length: 255 }).notNull(),
    hfCode: varchar("hf_code", { length: 100 }),
    authorityLevel: varchar("authority_level", { length: 100 }),
    authority: varchar("authority", { length: 255 }),
    ownership: varchar("ownership", { length: 255 }),
    facilityType: varchar("facility_type", { length: 100 }),
    ecologicalZone: ecologicalZoneEnum("ecological_zone"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("health_facility_hf_code_idx").on(t.hfCode),
    index("health_facility_name_idx").on(t.name),
  ],
);

export const health_facility_registries = pgTable(
  "health_facility_registries",
  {
    code: varchar("code", { length: 100 }).primaryKey(),
    name: jsonb("name").notNull(), // { en: string, np: string }
    municipalityId: uuid("municipality_id")
      .notNull()
      .references(() => municipalities.id),
    authority: varchar("authority", { length: 255 }).notNull(),
    ownership: varchar("ownership", { length: 255 }).notNull(),
    level: varchar("level", { length: 100 }).notNull(),
  },
);

// ============================================================
// USER & AUTH
// ============================================================

export const facility_population_targets = pgTable(
  "facility_population_targets",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`gen_random_uuid()`),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => health_facilities.id),
    fiscalYear: integer("fiscal_year").notNull(),
    expectedPregnancies: integer("expected_pregnancies").notNull(),
    expectedDeliveries: integer("expected_deliveries").notNull(),
    targetSetBy: uuid("target_set_by").references(() => users.id),
    targetSetAt: timestamp("target_set_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
    deletedBy: uuid("deleted_by"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    uniqueIndex("facility_population_target_unique").on(
      t.facilityId,
      t.fiscalYear,
    ),
  ],
);

export const healthFacilitiesRelations = relations(
  health_facilities,
  ({ one, many }) => ({
    municipality: one(municipalities, {
      fields: [health_facilities.municipalityId],
      references: [municipalities.id],
    }),
    province: one(provinces, {
      fields: [health_facilities.provinceId],
      references: [provinces.id],
    }),
    district: one(districts, {
      fields: [health_facilities.districtId],
      references: [districts.id],
    }),
    users: many(users),
    patients: many(patients),
    visits: many(visits),
    pregnancies: many(pregnancies),
    child_immunizations: many(child_immunizations),
    appointments: many(appointments),
    rosters: many(rosters),
    family_plannings: many(family_plannings),
  }),
);

export const healthFacilityRegistriesRelations = relations(
  health_facility_registries,
  ({ one }) => ({
    municipality: one(municipalities, {
      fields: [health_facility_registries.municipalityId],
      references: [municipalities.id],
    }),

  }),
);
