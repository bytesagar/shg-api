import { db } from "../../db";
import {
  patients,
  patient_identifiers,
  person_addresses,
  person_contacts,
  person_identifiers,
  person_names,
  persons,
  visits,
} from "../../db/schema";
import { FacilityRepository } from "../../core/facility-repository";
import { FacilityContext } from "../../context/facility-context";
import { PatientCreateInput } from "../../validations/patient.validation";
import { SQL, and, count, desc, eq, inArray } from "drizzle-orm";
import { format } from "date-fns";

type HydratedPatient = typeof patients.$inferSelect & {
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  name: string;
  phoneNumber: string | null;
};

export class PatientRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, patients.facilityId);
  }

  public async countAll(where?: SQL) {
    const result = await db
      .select({ count: count() })
      .from(patients)
      .where(this.withFacilityScope(where));
    return Number(result[0]?.count ?? 0);
  }

  public async findAll(
    where?: SQL,
    opts?: { limit: number; offset: number },
  ): Promise<HydratedPatient[]> {
    const base = db
      .select()
      .from(patients)
      .where(this.withFacilityScope(where));
    const records = opts
      ? await base
          .orderBy(desc(patients.createdAt))
          .limit(opts.limit)
          .offset(opts.offset)
      : await base;
    return this.hydratePatients(records);
  }

  public async findById(id: string): Promise<HydratedPatient | undefined> {
    const result = await db
      .select()
      .from(patients)
      .where(this.withFacilityScope(eq(patients.id, id)))
      .limit(1);
    const [hydrated] = await this.hydratePatients(result);
    return hydrated;
  }

  public async updateFamilyPlanningProfile(
    id: string,
    data: {
      education: string;
      occupation: string;
      occupationOther?: string | null;
      spouseName?: string | null;
      childrenMale?: number | null;
      childrenFemale?: number | null;
    },
  ) {
    const updated = await db
      .update(patients)
      .set({
        education: data.education,
        occupation: data.occupation,
        occupationOther: data.occupationOther ?? null,
        spouseName: data.spouseName ?? null,
        childrenMale: data.childrenMale ?? null,
        childrenFemale: data.childrenFemale ?? null,
        updatedAt: new Date(),
        updatedBy: this.context.userId,
      })
      .where(this.withFacilityScope(eq(patients.id, id)))
      .returning();

    const row = updated[0];
    if (!row) return null;
    const [hydrated] = await this.hydratePatients([row]);
    return hydrated;
  }

  public async createWithInitialVisit(
    data: PatientCreateInput,
    patientId: string,
  ) {
    return db.transaction(async (tx) => {
      const insertedPerson = await tx
        .insert(persons)
        .values({
          gender: data.gender ?? null,
          birthDate: data.birthDate ?? null,
          status: data.status === "deceased" ? "deceased" : "active",
        })
        .returning();
      const person = insertedPerson[0];

      await tx.insert(person_names).values({
        personId: person.id,
        use: "official",
        family: data.lastName,
        given: data.firstName,
        middle: data.middleName ?? null,
        isPrimary: true,
      });

      if (data.phoneNumber) {
        await tx.insert(person_contacts).values({
          personId: person.id,
          system: "phone",
          use: "mobile",
          value: data.phoneNumber,
          isPrimary: true,
        });
      }

      if (data.address) {
        await tx.insert(person_addresses).values({
          personId: person.id,
          use: "home",
          line1: data.address.line1 ?? null,
          line2: data.address.line2 ?? null,
          municipality: data.address.municipality ?? null,
          district: data.address.district ?? null,
          province: data.address.province ?? null,
          ward: data.address.ward ?? null,
          postalCode: data.address.postalCode ?? null,
          isPrimary: true,
        });
      }

      for (const identifier of data.identifiers ?? []) {
        await tx.insert(person_identifiers).values({
          personId: person.id,
          system: identifier.system,
          value: identifier.value,
          use: identifier.use ?? "official",
          isPrimary: Boolean(identifier.isPrimary),
        });
      }

      const inserted = await tx
        .insert(patients)
        .values({
          patientId,
          personId: person.id,
          service: data.service,
          education: data.education ?? null,
          occupation: data.occupation ?? null,
          occupationOther: data.occupationOther ?? null,
          spouseName: data.spouseName ?? null,
          childrenMale: data.childrenMale ?? null,
          childrenFemale: data.childrenFemale ?? null,
          facilityId: this.context.facilityId,
          assignedUserId: data.assignedUserId ?? null,
          status: data.status,
          createdBy: this.context.userId,
          updatedBy: this.context.userId,
        })
        .returning();
      const newPatient = inserted[0];

      await tx.insert(patient_identifiers).values({
        patientId: newPatient.id,
        system: "patient-id",
        value: patientId,
        use: "official",
        isPrimary: true,
      });

      if (data.service.toLowerCase() !== "family-planning") {
        await tx.insert(visits).values({
          date: format(new Date(), "yyyy-MM-dd"),
          reason: "Patient Registration",
          patientId: newPatient.id,
          facilityId: this.context.facilityId,
        });
      }

      return newPatient;
    });
  }

  private async hydratePatients(
    records: Array<typeof patients.$inferSelect>,
  ): Promise<HydratedPatient[]> {
    if (!records.length) return [];

    const patientIds = records.map((p) => p.id);

    const rows = await db
      .select({
        patientId: patients.id,
        given: person_names.given,
        middle: person_names.middle,
        family: person_names.family,
        phoneNumber: person_contacts.value,
        birthDate: persons.birthDate,
        gender: persons.gender,
      })
      .from(patients)
      .where(inArray(patients.id, patientIds))
      .leftJoin(persons, eq(patients.personId, persons.id))
      .leftJoin(
        person_names,
        and(
          eq(person_names.personId, patients.personId),
          eq(person_names.isPrimary, true),
        ),
      )
      .leftJoin(
        person_contacts,
        and(
          eq(person_contacts.personId, patients.personId),
          eq(person_contacts.isPrimary, true),
          eq(person_contacts.system, "phone"),
        ),
      );

    const hydratedById = new Map(rows.map((row) => [row.patientId, row]));

    return records.map((patient) => {
      const hydrated = hydratedById.get(patient.id);

      return {
        ...patient,
        firstName: hydrated?.given ?? null,
        middleName: hydrated?.middle ?? null,
        lastName: hydrated?.family ?? null,
        name: [hydrated?.given, hydrated?.middle, hydrated?.family]
          .filter(Boolean)
          .join(" "),
        phoneNumber: hydrated?.phoneNumber ?? null,
        birthDate: hydrated?.birthDate ?? null,
        gender: hydrated?.gender ?? null,
      };
    });
  }
}
