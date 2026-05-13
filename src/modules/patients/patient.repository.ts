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
import { SQL, and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { format } from "date-fns";
import { flattenEntityDetail } from "../../utils/entity-detail";
import {
  patientDetailRelations,
  type PatientAddress,
  type PatientContact,
  type PatientDetail,
  type PatientIdentifier,
  type PatientName,
} from "./patient-detail.config";

type HydratedPatient = typeof patients.$inferSelect & {
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  name: string;
  phoneNumber: string | null;
  birthDate: Date | null;
  gender: (typeof persons.$inferSelect)["gender"] | null;
  bloodGroup: (typeof persons.$inferSelect)["bloodGroup"] | null;
};

// PatientDetail interface lives in ./patient-detail.config.ts so the frontend
// can pull it without importing repository internals.

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

  public async findDetailById(id: string): Promise<PatientDetail | null> {
    // 1) Fetch the patient + linked person under facility scope. This is the
    //    only access-control gate; child relations are loaded by personId/
    //    patientId from rows we've already verified the caller can see.
    const parentRows = await db
      .select({
        // patients
        id: patients.id,
        patientId: patients.patientId,
        personId: patients.personId,
        service: patients.service,
        education: patients.education,
        occupation: patients.occupation,
        occupationOther: patients.occupationOther,
        spouseName: patients.spouseName,
        childrenMale: patients.childrenMale,
        childrenFemale: patients.childrenFemale,
        status: patients.status,
        facilityId: patients.facilityId,
        assignedUserId: patients.assignedUserId,
        createdAt: patients.createdAt,
        updatedAt: patients.updatedAt,
        // persons
        personGender: persons.gender,
        personBloodGroup: persons.bloodGroup,
        personBirthDate: persons.birthDate,
        personDeceasedAt: persons.deceasedAt,
        personStatus: persons.status,
      })
      .from(patients)
      .innerJoin(persons, eq(persons.id, patients.personId))
      .where(
        this.withFacilityScope(and(eq(patients.id, id), isNull(patients.deletedAt))),
      )
      .limit(1);

    const parent = parentRows[0];
    if (!parent) return null;

    // 2) Build the parent half of the response (camelCase, ISO-8601 dates,
    //    no soft-delete / audit columns).
    const parentShape = {
      id: parent.id,
      patientId: parent.patientId,
      personId: parent.personId,
      service: parent.service,
      education: parent.education,
      occupation: parent.occupation,
      occupationOther: parent.occupationOther,
      spouseName: parent.spouseName,
      childrenMale: parent.childrenMale,
      childrenFemale: parent.childrenFemale,
      status: parent.status,
      facilityId: parent.facilityId,
      assignedUserId: parent.assignedUserId,
      createdAt: parent.createdAt.toISOString(),
      updatedAt: parent.updatedAt ? parent.updatedAt.toISOString() : null,
      person: {
        id: parent.personId,
        gender: parent.personGender,
        bloodGroup: parent.personBloodGroup,
        birthDate: parent.personBirthDate ? parent.personBirthDate.toISOString() : null,
        deceasedAt: parent.personDeceasedAt ? parent.personDeceasedAt.toISOString() : null,
        status: parent.personStatus,
      },
    };

    // 3) Fan out the child relations in parallel (one query each, all keyed
    //    on indexed FKs). The helper applies each relation's declared rule.
    //    person_* relations key on personId; patient_* relations key on patient.id.
    const personRelations = patientDetailRelations.filter(
      (rel) => rel.parentColumn !== patient_identifiers.patientId,
    );
    const patientRelations = patientDetailRelations.filter(
      (rel) => rel.parentColumn === patient_identifiers.patientId,
    );

    const personDetail = await flattenEntityDetail(
      parentShape,
      parent.personId,
      personRelations,
    );
    const patientDetail = await flattenEntityDetail(
      personDetail,
      parent.id,
      patientRelations,
    );

    // 4) Resolve geography FK names (province/district/municipality). The
    //    helper only projects columns from person_addresses; the human-readable
    //    names live in three reference tables. Done in one round-trip via
    //    scalar subqueries so we don't slow down the happy path (no FKs set ->
    //    skip the query entirely). Legacy free-text columns are back-filled
    //    when null so the contract `address.province: string` stays usable.
    const address = (patientDetail as unknown as { address: PatientAddress | null }).address;
    const resolvedAddress = await this.resolveAddressNames(address);

    // 5) Convenience derived fields (firstName/middleName/lastName/name) -
    //    kept so existing frontend consumers don't break when this replaces
    //    the previous detail shape.
    const nameRecord = (patientDetail as unknown as { name: PatientName | null })
      .name;
    const firstName = nameRecord?.given ?? null;
    const middleName = nameRecord?.middle ?? null;
    const lastName = nameRecord?.family ?? null;
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");

    return {
      ...patientDetail,
      // re-key `name` (the picked person_names row) to `nameRecord` to avoid
      // colliding with the legacy convenience field `name: <full string>`.
      name: fullName,
      nameRecord,
      firstName,
      middleName,
      lastName,
      // these come back from `flattenEntityDetail` already correctly typed
      // but TS can't see through the helper's broad return type.
      primaryContact: (patientDetail as unknown as { primaryContact: PatientContact | null })
        .primaryContact,
      address: resolvedAddress,
      personIdentifiers: (patientDetail as unknown as {
        personIdentifiers: Record<string, PatientIdentifier>;
      }).personIdentifiers,
      patientIdentifiers: (patientDetail as unknown as {
        patientIdentifiers: Record<string, PatientIdentifier>;
      }).patientIdentifiers,
    } as PatientDetail;
  }

  /**
   * Resolves the three geography FK IDs on an address to their bilingual names
   * from the `provinces` / `districts` / `municipalities` reference tables.
   * No FKs set, or no address at all, returns input unchanged - no query fired.
   *
   * Also back-fills the legacy `province` / `district` / `municipality` free-text
   * fields from the resolved English name when they're null, so the response
   * contract has no empty strings when geography data exists.
   */
  private async resolveAddressNames(
    address: PatientAddress | null,
  ): Promise<PatientAddress | null> {
    if (!address) return null;
    if (!address.provinceId && !address.districtId && !address.municipalityId) {
      return {
        ...address,
        provinceName: null,
        districtName: null,
        municipalityName: null,
      };
    }

    const rows = await db.execute<{
      provinceName: { en: string; np: string } | null;
      districtName: { en: string; np: string } | null;
      municipalityName: { en: string; np: string } | null;
    }>(sql`
      select
        (select name from provinces where id = ${address.provinceId}::uuid) as "provinceName",
        (select name from districts where id = ${address.districtId}::uuid) as "districtName",
        (select name from municipalities where id = ${address.municipalityId}::uuid) as "municipalityName"
    `);

    const row = rows.rows[0];
    const provinceName = row?.provinceName ?? null;
    const districtName = row?.districtName ?? null;
    const municipalityName = row?.municipalityName ?? null;

    return {
      ...address,
      province: address.province ?? provinceName?.en ?? null,
      district: address.district ?? districtName?.en ?? null,
      municipality: address.municipality ?? municipalityName?.en ?? null,
      provinceName,
      districtName,
      municipalityName,
    };
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

  public async findDuplicateCandidate(params: {
    firstName: string;
    lastName: string;
    birthDate?: string | null;
    phoneNumber?: string | null;
    identifiers?: Array<{ system: string; value: string }> | null;
  }) {
    const identifiers = (params.identifiers ?? []).filter(
      (i) => i.system?.trim() && i.value?.trim(),
    );

    if (identifiers.length > 0) {
      const systemValues = identifiers.map(
        (i) => `${i.system.trim()}\u0000${i.value.trim()}`,
      );

      const rows = await db
        .select({ patientId: patients.id })
        .from(patients)
        .innerJoin(persons, eq(persons.id, patients.personId))
        .innerJoin(
          person_identifiers,
          eq(person_identifiers.personId, persons.id),
        )
        .where(
          this.withFacilityScope(
            and(
              isNull(patients.deletedAt),
              inArray(
                sql`${person_identifiers.system} || '\u0000' || ${person_identifiers.value}`,
                systemValues,
              ),
            ),
          ),
        )
        .limit(1);

      if (rows[0]) return { patientId: rows[0].patientId };
    }

    if (params.phoneNumber && params.birthDate) {
      const rows = await db
        .select({ patientId: patients.id })
        .from(patients)
        .innerJoin(persons, eq(persons.id, patients.personId))
        .innerJoin(
          person_names,
          and(
            eq(person_names.personId, persons.id),
            eq(person_names.isPrimary, true),
          ),
        )
        .innerJoin(
          person_contacts,
          and(
            eq(person_contacts.personId, persons.id),
            eq(person_contacts.isPrimary, true),
            eq(person_contacts.system, "phone"),
          ),
        )
        .where(
          this.withFacilityScope(
            and(
              isNull(patients.deletedAt),
              eq(person_contacts.value, params.phoneNumber),
              sql`${persons.birthDate}::date = ${params.birthDate}::date`,
              sql`lower(coalesce(${person_names.given}, '')) = lower(${params.firstName})`,
              sql`lower(coalesce(${person_names.family}, '')) = lower(${params.lastName})`,
            ),
          ),
        )
        .limit(1);

      if (rows[0]) return { patientId: rows[0].patientId };
    }

    return null;
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
          bloodGroup: data.bloodGroup ?? "unknown",
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
          municipalityId: data.address.municipalityId ?? null,
          districtId: data.address.districtId ?? null,
          provinceId: data.address.provinceId ?? null,
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
          service: data.service,
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
        bloodGroup: persons.bloodGroup,
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
        bloodGroup: hydrated?.bloodGroup ?? null,
      };
    });
  }
}
