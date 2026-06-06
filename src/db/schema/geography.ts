import {
  pgTable,
  integer,
  timestamp,
  jsonb,
  uuid,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  users,
} from "./auth";
import {
  health_facilities,
  health_facility_registries,
} from "./facilities";
import {
  patients,
} from "./patient";

export const provinces = pgTable("provinces", {
  id: uuid("id")
    .primaryKey()
    .notNull()
    .default(sql`gen_random_uuid()`),
  name: jsonb("name").notNull(), // { en: string, np: string }
  code: integer("code").notNull(),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
  deletedBy: uuid("deleted_by"),
  deletedAt: timestamp("deleted_at"),
});

export const districts = pgTable("districts", {
  id: uuid("id")
    .primaryKey()
    .notNull()
    .default(sql`gen_random_uuid()`),
  provinceId: uuid("province_id")
    .notNull()
    .references(() => provinces.id),
  code: integer("code").notNull(),
  name: jsonb("name").notNull(), // { en: string, np: string }
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
  deletedBy: uuid("deleted_by"),
  deletedAt: timestamp("deleted_at"),
});

export const municipalities = pgTable("municipalities", {
  id: uuid("id")
    .primaryKey()
    .notNull()
    .default(sql`gen_random_uuid()`),
  districtId: uuid("district_id")
    .notNull()
    .references(() => districts.id),
  code: integer("code").notNull(),
  name: jsonb("name").notNull(), // { en: string, np: string }
  noOfWards: integer("no_of_wards").notNull(),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
  deletedBy: uuid("deleted_by"),
  deletedAt: timestamp("deleted_at"),
});

// ============================================================
// HEALTH FACILITY
// ============================================================

export const provincesRelations = relations(provinces, ({ many }) => ({
  districts: many(districts),
}));

export const districtsRelations = relations(districts, ({ one, many }) => ({
  province: one(provinces, {
    fields: [districts.provinceId],
    references: [provinces.id],
  }),
  municipalities: many(municipalities),
}));

export const municipalitiesRelations = relations(
  municipalities,
  ({ one, many }) => ({
    district: one(districts, {
      fields: [municipalities.districtId],
      references: [districts.id],
    }),
    facilities: many(health_facilities),
    registries: many(health_facility_registries),
    patients: many(patients),
    users: many(users),
  }),
);
