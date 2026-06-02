import { randomUUID } from "crypto";

import { eq } from "drizzle-orm";

import { db } from "../../db";
import {
  patient_identifiers,
  patients,
  person_addresses,
  person_contacts,
  person_identifiers,
  person_names,
  persons,
} from "../../db/schema";
import { normalizeNepaliPhone } from "../../utils/phone";
import {
  resolveUserFk,
  type MigrationContext,
  type MigrationStep,
} from "../context";
import {
  mapCaste,
  mapGender,
  mapPatientStatus,
  mapService,
} from "../enums";
import { v1Batches } from "../v1-client";

/**
 * Patients — the heart of the structural transform: a flat v1 `Patient` row is
 * exploded into the normalized v2 model:
 *   persons (+ person_names / person_contacts / person_addresses /
 *   person_identifiers) -> patients (+ patient_identifiers)
 *
 * Notes from the snapshot:
 *  - Every v1 patient has a `dob`, so birthDate is taken verbatim (the
 *    age/age_unit derivation is kept only as a safety fallback).
 *  - ~47% have null first/last name -> we split the legacy `name` field.
 *  - nationalId -> person_identifiers(system urn:np:national-id);
 *    nhisNumber -> patient_identifiers(system urn:np:nhis). Both have a GLOBAL
 *    unique (system,value) index and the data contains some duplicates, so we
 *    insert with onConflictDoNothing and count skips.
 *  - assignedUserId / createdBy / updatedBy / deletedBy are rewired through the
 *    user id-map (unresolved -> system user, recorded).
 */
const NID_SYSTEM = "urn:np:national-id";
const NHIS_SYSTEM = "urn:np:nhis";

interface V1Patient {
  id: number;
  patientId: string;
  name: string | null;
  caste: string | null;
  age: number;
  gender: string;
  province: string;
  district: string;
  palika: string;
  ward: number;
  phoneNumber: string;
  service: string;
  nationalId: string | null;
  nhisNumber: string | null;
  assignedUserId: number | null;
  facilityId: number | null;
  status: string | null;
  dob: Date | null;
  age_unit: string;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  children_female: number | null;
  children_male: number | null;
  education: string | null;
  occupation: string | null;
  other_occupation: string | null;
  spouse_name: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  createdBy: number | null;
  updatedBy: number | null;
  deletedAt: Date | null;
  deletedBy: number | null;
  districtId: number | null;
  municipalityId: number | null;
  provinceId: number | null;
}

function trunc(s: string | null | undefined, n: number): string | null {
  if (s == null) return null;
  const t = String(s).trim();
  if (!t) return null;
  return t.length > n ? t.slice(0, n) : t;
}

/** Split a legacy single `name` into given/middle/family. */
function splitName(name: string | null): {
  given: string | null;
  middle: string | null;
  family: string | null;
} {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return { given: null, middle: null, family: null };
  if (parts.length === 1) return { given: parts[0], middle: null, family: null };
  if (parts.length === 2) return { given: parts[0], middle: null, family: parts[1] };
  return {
    given: parts[0],
    middle: parts.slice(1, -1).join(" "),
    family: parts[parts.length - 1],
  };
}

/** today − age (years|months|days). Fallback only; real data has dob. */
function deriveBirthDate(age: number, unit: string): Date {
  const d = new Date();
  if (unit === "months") d.setMonth(d.getMonth() - age);
  else if (unit === "days") d.setDate(d.getDate() - age);
  else d.setFullYear(d.getFullYear() - age);
  return d;
}

export const patientsStep: MigrationStep = {
  key: "patients",
  title: "Patients (person normalization)",
  async run(ctx: MigrationContext): Promise<void> {
    const { idMap, report } = ctx;

    let total = 0;
    for await (const batch of v1Batches<V1Patient>(
      `"Patient"`,
      "id",
      ctx.batchSize,
      `id, "patientId", name, caste, age, gender, province, district, palika, ward,
       "phoneNumber", service, "nationalId", "nhisNumber", "assignedUserId",
       "facilityId", status, dob, age_unit, first_name, last_name, middle_name,
       children_female, children_male, education, occupation, other_occupation,
       spouse_name, "createdAt", "updatedAt", "createdBy", "updatedBy",
       "deletedAt", "deletedBy", "districtId", "municipalityId", "provinceId"`,
    )) {
      total += batch.length;
      for (const p of batch) {
        if (idMap.has("patient", p.id)) {
          report.skipped("patient");
          continue;
        }

        // Idempotency across crashes: adopt an existing patient by patientId.
        if (!ctx.dryRun) {
          const [pre] = await db
            .select({ id: patients.id })
            .from(patients)
            .where(eq(patients.patientId, p.patientId))
            .limit(1);
          if (pre) {
            await idMap.set("patient", p.id, pre.id);
            report.skipped("patient");
            continue;
          }
        }

        const facilityId = idMap.get("facility", p.facilityId) ?? null;
        const assignedUserId = idMap.get("user", p.assignedUserId) ?? null;
        const createdBy = resolveUserFk(ctx, "patient", p.id, "createdBy", p.createdBy);
        const updatedBy =
          p.updatedBy == null
            ? null
            : resolveUserFk(ctx, "patient", p.id, "updatedBy", p.updatedBy);
        const deletedBy =
          p.deletedBy == null
            ? null
            : resolveUserFk(ctx, "patient", p.id, "deletedBy", p.deletedBy);

        const birthDate =
          p.dob ?? (p.age != null ? deriveBirthDate(p.age, p.age_unit) : null);
        if (!p.dob && birthDate) report.recordDerivedBirthDate(p.id, birthDate.toISOString().slice(0, 10));

        // Name: prefer structured columns; else split legacy `name`.
        let given = trunc(p.first_name, 255);
        let middle = trunc(p.middle_name, 255);
        let family = trunc(p.last_name, 255);
        if (!given && !family) {
          const s = splitName(p.name);
          given = trunc(s.given, 255);
          middle = trunc(s.middle, 255);
          family = trunc(s.family, 255);
        }

        const phone = normalizeNepaliPhone(p.phoneNumber) ?? trunc(p.phoneNumber, 255);
        const provinceId = idMap.get("province", p.provinceId) ?? null;
        const districtId = idMap.get("district", p.districtId) ?? null;
        const municipalityId = idMap.get("municipality", p.municipalityId) ?? null;
        const personStatus = p.deletedAt ? ("inactive" as const) : ("active" as const);
        const nationalId = trunc(p.nationalId, 255);
        const nhis = trunc(p.nhisNumber, 255);

        if (ctx.dryRun) {
          // Validate enum maps / FK resolution; nothing persisted. Register a
          // synthetic id so downstream dry-run steps can resolve patientId.
          mapGender(p.gender, report);
          mapCaste(p.caste, report);
          mapPatientStatus(p.status, report);
          await idMap.set("patient", p.id, randomUUID());
          report.inserted("patient");
          continue;
        }

        const v2PatientId = await db.transaction(async (tx) => {
          const [person] = await tx
            .insert(persons)
            .values({
              gender: mapGender(p.gender, report),
              caste: mapCaste(p.caste, report),
              birthDate,
              status: personStatus,
              createdAt: p.createdAt ?? new Date(),
              updatedAt: p.updatedAt ?? null,
              deletedAt: p.deletedAt ?? null,
              deletedBy,
            })
            .returning({ id: persons.id });

          if (given || family || middle) {
            await tx.insert(person_names).values({
              personId: person.id,
              use: "official",
              given,
              middle,
              family,
              isPrimary: true,
            });
          }

          if (phone) {
            await tx.insert(person_contacts).values({
              personId: person.id,
              system: "phone",
              value: phone,
              isPrimary: true,
            });
          }

          // v1 province/district/palika are NOT NULL text -> always an address.
          await tx.insert(person_addresses).values({
            personId: person.id,
            use: "home",
            municipality: trunc(p.palika, 255),
            district: trunc(p.district, 255),
            province: trunc(p.province, 255),
            municipalityId,
            districtId,
            provinceId,
            ward: p.ward ?? null,
            isPrimary: true,
          });

          if (nationalId) {
            await tx
              .insert(person_identifiers)
              .values({
                personId: person.id,
                system: NID_SYSTEM,
                value: nationalId,
                isPrimary: true,
              })
              .onConflictDoNothing();
          }

          const [patient] = await tx
            .insert(patients)
            .values({
              personId: person.id,
              patientId: p.patientId,
              service: mapService(p.service),
              education: trunc(p.education, 255),
              occupation: trunc(p.occupation, 255),
              occupationOther: trunc(p.other_occupation, 255),
              spouseName: trunc(p.spouse_name, 255),
              childrenMale: p.children_male ?? null,
              childrenFemale: p.children_female ?? null,
              facilityId,
              assignedUserId,
              status: mapPatientStatus(p.status, report),
              createdAt: p.createdAt ?? new Date(),
              updatedAt: p.updatedAt ?? null,
              createdBy,
              updatedBy,
              deletedAt: p.deletedAt ?? null,
              deletedBy,
            })
            .returning({ id: patients.id });

          if (nhis) {
            await tx
              .insert(patient_identifiers)
              .values({
                patientId: patient.id,
                system: NHIS_SYSTEM,
                value: nhis,
                isPrimary: true,
              })
              .onConflictDoNothing();
          }

          return patient.id;
        });

        await idMap.set("patient", p.id, v2PatientId);
        report.inserted("patient");
      }
    }
    report.setV1Count("patient", total);
  },
};
