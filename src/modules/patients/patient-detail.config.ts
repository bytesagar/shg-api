import {
  patient_identifiers,
  patients,
  person_addresses,
  person_contacts,
  person_identifiers,
  person_names,
  persons,
} from "../../db/schema";
import type { ChildRelation } from "../../utils/entity-detail";

/**
 * Per-child rules for the flattened Patient detail response.
 *
 * - person_names      : flag-then-recency on is_primary  -> single object `name`
 * - person_contacts   : flag-then-recency on is_primary  -> single object `primaryContact`
 * - person_addresses  : flag-then-recency on is_primary  -> single object `address`
 * - person_identifiers: most recent per `system`         -> keyed map `personIdentifiers`
 * - patient_identifiers: most recent per `system`        -> keyed map `patientIdentifiers`
 *
 * "Most recent" defaults to updatedAt desc, createdAt desc, id desc.
 */
export const patientDetailRelations: ChildRelation[] = [
  {
    table: person_names,
    parentColumn: person_names.personId,
    fields: {
      use: person_names.use,
      given: person_names.given,
      middle: person_names.middle,
      family: person_names.family,
      prefix: person_names.prefix,
    },
    rule: { kind: "flagThenRecency", flagColumn: person_names.isPrimary },
    recencyColumns: [
      person_names.updatedAt,
      person_names.createdAt,
      person_names.id,
    ],
    outputKey: "name",
  },
  {
    table: person_contacts,
    parentColumn: person_contacts.personId,
    fields: {
      system: person_contacts.system,
      use: person_contacts.use,
      value: person_contacts.value,
      rank: person_contacts.rank,
    },
    rule: { kind: "flagThenRecency", flagColumn: person_contacts.isPrimary },
    recencyColumns: [
      person_contacts.updatedAt,
      person_contacts.createdAt,
      person_contacts.id,
    ],
    outputKey: "primaryContact",
  },
  {
    table: person_addresses,
    parentColumn: person_addresses.personId,
    fields: {
      use: person_addresses.use,
      line1: person_addresses.line1,
      line2: person_addresses.line2,
      municipality: person_addresses.municipality,
      district: person_addresses.district,
      province: person_addresses.province,
      municipalityId: person_addresses.municipalityId,
      districtId: person_addresses.districtId,
      provinceId: person_addresses.provinceId,
      ward: person_addresses.ward,
      postalCode: person_addresses.postalCode,
    },
    rule: { kind: "flagThenRecency", flagColumn: person_addresses.isPrimary },
    recencyColumns: [
      person_addresses.updatedAt,
      person_addresses.createdAt,
      person_addresses.id,
    ],
    outputKey: "address",
  },
  {
    table: person_identifiers,
    parentColumn: person_identifiers.personId,
    fields: {
      system: person_identifiers.system,
      value: person_identifiers.value,
      use: person_identifiers.use,
      periodStart: person_identifiers.periodStart,
      periodEnd: person_identifiers.periodEnd,
    },
    rule: { kind: "mostRecentPerGroup", groupColumn: person_identifiers.system },
    recencyColumns: [
      person_identifiers.updatedAt,
      person_identifiers.createdAt,
      person_identifiers.id,
    ],
    outputKey: "personIdentifiers",
  },
  {
    table: patient_identifiers,
    parentColumn: patient_identifiers.patientId,
    fields: {
      system: patient_identifiers.system,
      value: patient_identifiers.value,
      use: patient_identifiers.use,
      periodStart: patient_identifiers.periodStart,
      periodEnd: patient_identifiers.periodEnd,
    },
    rule: { kind: "mostRecentPerGroup", groupColumn: patient_identifiers.system },
    recencyColumns: [
      patient_identifiers.updatedAt,
      patient_identifiers.createdAt,
      patient_identifiers.id,
    ],
    outputKey: "patientIdentifiers",
  },
];

// ----------------------------------------------------------------------------
// Typed response shape - frontend consumes this.
// ----------------------------------------------------------------------------

export interface PatientName {
  use: string | null;
  given: string | null;
  middle: string | null;
  family: string | null;
  prefix: string | null;
}

export interface PatientContact {
  system: string;
  use: string | null;
  value: string;
  rank: number | null;
}

/** Bilingual reference-table name shape, mirrored from provinces/districts/municipalities. */
export interface BilingualName {
  en: string;
  np: string;
}

export interface PatientAddress {
  use: string | null;
  line1: string | null;
  line2: string | null;
  /**
   * Legacy free-text municipality. When null but `municipalityId` is set, this
   * is back-filled from `municipalityName.en` in the resolver step so the
   * field is never empty when geography data exists.
   */
  municipality: string | null;
  /** Same back-fill rule as `municipality`. */
  district: string | null;
  /** Same back-fill rule as `municipality`. */
  province: string | null;
  /** FK -> municipalities.id (newer geography model). */
  municipalityId: string | null;
  /** FK -> districts.id (newer geography model). */
  districtId: string | null;
  /** FK -> provinces.id (newer geography model). */
  provinceId: string | null;
  /** Resolved bilingual name from the municipalities reference table; null if no FK or row missing. */
  municipalityName: BilingualName | null;
  /** Resolved bilingual name from the districts reference table. */
  districtName: BilingualName | null;
  /** Resolved bilingual name from the provinces reference table. */
  provinceName: BilingualName | null;
  ward: number | null;
  postalCode: string | null;
}

export interface PatientIdentifier {
  system: string;
  value: string;
  use: string | null;
  /** ISO 8601 string. */
  periodStart: string | null;
  /** ISO 8601 string. */
  periodEnd: string | null;
}

/**
 * Persons-side fields surfaced on the Patient detail (not full row -
 * deletedBy/deletedAt are intentionally omitted).
 */
export interface PatientPerson {
  id: string;
  gender: (typeof persons.$inferSelect)["gender"];
  bloodGroup: (typeof persons.$inferSelect)["bloodGroup"];
  caste: (typeof persons.$inferSelect)["caste"];
  /** ISO 8601 string. */
  birthDate: string | null;
  /** ISO 8601 string. */
  deceasedAt: string | null;
  status: (typeof persons.$inferSelect)["status"];
}

/**
 * Flattened Patient detail. One object representing the patient's current
 * state - no arrays of historical rows.
 */
export interface PatientDetail {
  // Core patient fields
  id: string;
  patientId: string;
  personId: string;
  service: string;
  education: string | null;
  occupation: string | null;
  occupationOther: string | null;
  spouseName: string | null;
  childrenMale: number | null;
  childrenFemale: number | null;
  status: (typeof patients.$inferSelect)["status"];
  facilityId: string | null;
  assignedUserId: string | null;
  /** ISO 8601 string. */
  createdAt: string;
  /** ISO 8601 string. */
  updatedAt: string | null;

  // Convenience derived fields (kept for backwards-compat with the previous
  // detail response shape that the frontend already consumes).
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  name: string;

  // Nested person and child relations.
  person: PatientPerson;
  /** Primary name, or null if none on file. */
  nameRecord: PatientName | null;
  /** Primary contact, or null if none on file. */
  primaryContact: PatientContact | null;
  /** Primary address, or null if none on file. */
  address: PatientAddress | null;
  /** Person-level identifiers keyed by `system`. Empty object if none. */
  personIdentifiers: Record<string, PatientIdentifier>;
  /** Patient-level identifiers keyed by `system`. Empty object if none. */
  patientIdentifiers: Record<string, PatientIdentifier>;
}
