import { and, desc, eq, gte, ilike, inArray, lte, or, SQL, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  attachments,
  appointments,
  antenatal_cares,
  child_immunizations,
  confirm_diagnoses,
  deliveries,
  encounters,
  family_plannings,
  growths,
  home_baby_postnatal_cares,
  home_mother_postnatal_cares,
  health_facilities,
  histories,
  immunization_histories,
  medications,
  patient_identifiers,
  patients,
  person_contacts,
  person_identifiers,
  person_names,
  persons,
  practitioner_role_assignments,
  practitioners,
  pregnancies,
  provisional_diagnoses,
  postnatal_cares,
  tests,
  users,
  visits,
  vitals,
} from "../../db/schema";
import { FacilityContext } from "../../context/facility-context";
import { parseDateFilterToken, parseTokenFilter } from "./fhir-search.query";
import { FhirSearchBundle, FhirSearchRequest } from "./fhir-search.types";
import {
  mapAllergyIntoleranceResource,
  mapAppointmentResource,
  mapConditionResource,
  mapCarePlanResource,
  mapDocumentReferenceResource,
  mapEncounterResource,
  mapEpisodeOfCareResource,
  mapImmunizationResource,
  mapMedicationRequestResource,
  mapObservationResource,
  mapOrganizationResource,
  mapPatientResource,
  mapPractitionerResource,
  mapPractitionerRoleResource,
} from "./fhir-resource.mappers";
import { format } from "date-fns";

export class FhirSearchService {
  constructor(private readonly context: FacilityContext) {}

  private async buildPatientResourceMap(patientIds: string[]) {
    if (!patientIds.length) return new Map<string, any>();
    const rows = await db
      .select({
        patient: patients,
        person: persons,
        name: person_names,
        phone: person_contacts,
      })
      .from(patients)
      .innerJoin(persons, eq(persons.id, patients.personId))
      .leftJoin(
        person_names,
        and(eq(person_names.personId, persons.id), eq(person_names.isPrimary, true)),
      )
      .leftJoin(
        person_contacts,
        and(
          eq(person_contacts.personId, persons.id),
          eq(person_contacts.system, "phone"),
          eq(person_contacts.isPrimary, true),
        ),
      )
      .where(inArray(patients.id, patientIds));

    return new Map(
      rows.map((row) => [
        row.patient.id,
        mapPatientResource({
          id: row.patient.id,
          active: row.patient.status === "active",
          patientId: row.patient.patientId,
          name: row.name,
          telecom: row.phone,
          gender: row.person.gender,
          birthDate: row.person.birthDate,
        }),
      ]),
    );
  }

  private async buildOrganizationResourceMap(organizationIds: string[]) {
    if (!organizationIds.length) return new Map<string, any>();
    const rows = await db
      .select()
      .from(health_facilities)
      .where(inArray(health_facilities.id, organizationIds));
    return new Map(
      rows.map((row) => [
        row.id,
        mapOrganizationResource({
          id: row.id,
          name: row.name,
          active: !row.deletedAt,
          hfCode: row.hfCode,
          phone: row.phone,
          email: row.email,
          address: row.address,
          ward: row.ward,
          palika: row.palika,
          district: row.district,
          province: row.province,
        }),
      ]),
    );
  }

  private async buildPractitionerResourceMap(practitionerIds: string[]) {
    if (!practitionerIds.length) return new Map<string, any>();
    const rows = await db
      .select({
        practitioner: practitioners,
        user: users,
      })
      .from(practitioners)
      .leftJoin(users, eq(users.id, practitioners.userId))
      .where(inArray(practitioners.id, practitionerIds));
    return new Map(
      rows.map((row) => [
        row.practitioner.id,
        mapPractitionerResource({
          id: row.practitioner.id,
          active: row.practitioner.active,
          nameText: [row.user?.firstName, row.user?.lastName]
            .filter(Boolean)
            .join(" "),
        }),
      ]),
    );
  }

  private async appendRevIncludesForPatient(
    entries: Array<{ resource: any }>,
    patientIds: string[],
    revincludeValues: string[],
  ) {
    const entryById = new Set(entries.map((e) => `${e.resource.resourceType}/${e.resource.id}`));
    if (!patientIds.length || !revincludeValues.length) return entries;

    if (revincludeValues.includes("Encounter:subject")) {
      const encounterRows = await db
        .select()
        .from(encounters)
        .where(
          and(
            eq(encounters.facilityId, this.context.facilityId),
            inArray(encounters.patientId, patientIds),
          ),
        );
      for (const enc of encounterRows) {
        const key = `Encounter/${enc.id}`;
        if (entryById.has(key)) continue;
        entries.push({
          resource: mapEncounterResource({
            id: enc.id,
            status: enc.status,
            encounterType: enc.encounterType,
            patientId: enc.patientId,
            encounterAt: enc.encounterAt,
            reason: enc.reason,
          }),
        });
        entryById.add(key);
      }
    }

    if (revincludeValues.includes("Condition:subject")) {
      const [provisionalRows, confirmedRows] = await Promise.all([
        db.select().from(provisional_diagnoses).where(inArray(provisional_diagnoses.patientId, patientIds)),
        db.select().from(confirm_diagnoses).where(inArray(confirm_diagnoses.patientId, patientIds)),
      ]);
      for (const row of provisionalRows) {
        const key = `Condition/${row.id}`;
        if (entryById.has(key)) continue;
        entries.push({
          resource: mapConditionResource({
            id: row.id,
            patientId: row.patientId,
            encounterId: row.encounterId,
            recordedDate: row.createdAt,
            description: row.description,
            verificationStatus: "provisional",
          }),
        });
        entryById.add(key);
      }
      for (const row of confirmedRows) {
        const key = `Condition/${row.id}`;
        if (entryById.has(key)) continue;
        entries.push({
          resource: mapConditionResource({
            id: row.id,
            patientId: row.patientId,
            encounterId: row.encounterId,
            recordedDate: row.createdAt,
            description: row.description,
            verificationStatus: "confirmed",
            icdCode: row.icdCode,
          }),
        });
        entryById.add(key);
      }
    }

    if (revincludeValues.includes("MedicationRequest:subject")) {
      const medRows = await db
        .select()
        .from(medications)
        .where(inArray(medications.patientId, patientIds));
      for (const row of medRows) {
        const key = `MedicationRequest/${row.id}`;
        if (entryById.has(key)) continue;
        entries.push({
          resource: mapMedicationRequestResource({
            id: row.id,
            patientId: row.patientId,
            encounterId: row.encounterId,
            medicineName: row.medicineName,
            authoredOn: row.createdAt,
            dosageText: [row.dosage, row.times, row.route, row.beforeAfter, row.duration]
              .filter(Boolean)
              .join(" "),
          }),
        });
        entryById.add(key);
      }
    }

    if (revincludeValues.includes("Observation:subject")) {
      const encounterRows = await db
        .select({
          id: encounters.id,
          patientId: encounters.patientId,
          encounterAt: encounters.encounterAt,
        })
        .from(encounters)
        .where(
          and(
            eq(encounters.facilityId, this.context.facilityId),
            inArray(encounters.patientId, patientIds),
          ),
        );
      const encounterById = new Map(encounterRows.map((e) => [e.id, e]));
      const [testRows, vitalRows] = await Promise.all([
        db.select().from(tests).where(inArray(tests.encounterId, encounterRows.map((e) => e.id))),
        db.select().from(vitals).where(inArray(vitals.encounterId, encounterRows.map((e) => e.id))),
      ]);
      for (const row of testRows) {
        if (!row.encounterId) continue;
        const enc = encounterById.get(row.encounterId);
        if (!enc) continue;
        const key = `Observation/${row.id}`;
        if (entryById.has(key)) continue;
        entries.push({
          resource: mapObservationResource("ObservationLab", {
            resourceType: "Observation",
            id: row.id,
            status: "final",
            category: [{ text: row.testCategory }],
            code: { text: row.testName },
            subject: { reference: `Patient/${enc.patientId}` },
            encounter: { reference: `Encounter/${enc.id}` },
            effectiveDateTime: enc.encounterAt,
            valueString: row.testResult,
          }),
        });
        entryById.add(key);
      }
      for (const row of vitalRows) {
        if (!row.encounterId) continue;
        const enc = encounterById.get(row.encounterId);
        if (!enc) continue;
        const key = `Observation/${row.id}`;
        if (entryById.has(key)) continue;
        entries.push({
          resource: mapObservationResource("ObservationVital", {
            resourceType: "Observation",
            id: row.id,
            status: "final",
            category: [{ text: "vital-signs" }],
            code: { text: "vital-panel" },
            subject: { reference: `Patient/${enc.patientId}` },
            encounter: { reference: `Encounter/${enc.id}` },
            effectiveDateTime: enc.encounterAt,
            component: [
              { code: { text: "temperature" }, valueQuantity: { value: row.temperature, unit: "C" } },
              { code: { text: "pulse" }, valueQuantity: { value: row.pulse, unit: "/min" } },
              { code: { text: "respiratory-rate" }, valueQuantity: { value: row.respiratoryRate, unit: "/min" } },
              { code: { text: "spo2" }, valueQuantity: { value: row.spo2, unit: "%" } },
            ],
          }),
        });
        entryById.add(key);
      }
    }

    return entries;
  }

  public async searchPatient(query: FhirSearchRequest): Promise<FhirSearchBundle<any>> {
    const conditions: SQL[] = [eq(patients.facilityId, this.context.facilityId)];

    const patientIdValues = query.filters._id;
    if (patientIdValues?.length) {
      conditions.push(inArray(patients.id, patientIdValues));
    }

    const activeValues = query.filters.active;
    if (activeValues?.length) {
      const latest = activeValues[0].toLowerCase() === "true";
      if (latest) conditions.push(eq(patients.status, "active"));
      else conditions.push(or(eq(patients.status, "inactive"), eq(patients.status, "deceased"))!);
    }

    const genderValues = query.filters.gender;
    if (genderValues?.length) {
      conditions.push(eq(persons.gender, genderValues[0] as "male" | "female" | "other"));
    }

    const birthdateValues = query.filters.birthdate;
    if (birthdateValues?.length) {
      const parsed = parseDateFilterToken(birthdateValues[0]);
      if (parsed.op === "eq") conditions.push(eq(persons.birthDate, parsed.value));
      if (parsed.op === "ge") conditions.push(gte(persons.birthDate, parsed.value));
      if (parsed.op === "gt") conditions.push(gte(persons.birthDate, parsed.value));
      if (parsed.op === "le") conditions.push(lte(persons.birthDate, parsed.value));
      if (parsed.op === "lt") conditions.push(lte(persons.birthDate, parsed.value));
    }

    const nameFilters = query.filters.name;
    const telecomFilters = query.filters.telecom;
    const identifierFilters = query.filters.identifier;
    if (nameFilters?.length) {
      conditions.push(
        or(
          ...nameFilters.map((value) =>
            or(
              ilike(person_names.given, `%${value}%`),
              ilike(person_names.middle, `%${value}%`),
              ilike(person_names.family, `%${value}%`),
            )!,
          ),
        )!,
      );
    }
    if (telecomFilters?.length) {
      conditions.push(
        or(
          ...telecomFilters.map((value) =>
            ilike(person_contacts.value, `%${value}%`),
          ),
        )!,
      );
    }

    if (identifierFilters?.length) {
      const tokens = identifierFilters.map(parseTokenFilter);
      const personIdentifierClauses = tokens.map((token) =>
        and(
          token.system ? eq(person_identifiers.system, token.system) : undefined,
          ilike(person_identifiers.value, `%${token.value}%`),
        ),
      );
      const patientIdentifierClauses = tokens.map((token) =>
        and(
          token.system ? eq(patient_identifiers.system, token.system) : undefined,
          ilike(patient_identifiers.value, `%${token.value}%`),
        ),
      );

      const [personMatches, patientMatches] = await Promise.all([
        db
          .select({ personId: person_identifiers.personId })
          .from(person_identifiers)
          .innerJoin(persons, eq(persons.id, person_identifiers.personId))
          .innerJoin(patients, eq(patients.personId, persons.id))
          .where(
            and(
              eq(patients.facilityId, this.context.facilityId),
              or(...personIdentifierClauses)!,
            ),
          ),
        db
          .select({ patientId: patient_identifiers.patientId })
          .from(patient_identifiers)
          .innerJoin(patients, eq(patients.id, patient_identifiers.patientId))
          .where(
            and(
              eq(patients.facilityId, this.context.facilityId),
              or(...patientIdentifierClauses)!,
            ),
          ),
      ]);

      const personIds = [...new Set(personMatches.map((row) => row.personId))];
      const patientIds = [...new Set(patientMatches.map((row) => row.patientId))];
      if (!personIds.length && !patientIds.length) {
        return {
          resourceType: "Bundle",
          type: "searchset",
          total: 0,
          entry: [],
        };
      }
      conditions.push(
        or(
          personIds.length ? inArray(persons.id, personIds) : undefined,
          patientIds.length ? inArray(patients.id, patientIds) : undefined,
        )!,
      );
    }

    const totalRows = await db
      .select({
        count: sql<number>`count(distinct ${patients.id})`,
      })
      .from(patients)
      .innerJoin(persons, eq(persons.id, patients.personId))
      .leftJoin(
        person_names,
        and(eq(person_names.personId, persons.id), eq(person_names.isPrimary, true)),
      )
      .leftJoin(
        person_contacts,
        and(
          eq(person_contacts.personId, persons.id),
          eq(person_contacts.system, "phone"),
          eq(person_contacts.isPrimary, true),
        ),
      )
      .where(and(...conditions));
    const total = Number(totalRows[0]?.count ?? 0);

    const rows = await db
      .select({
        patient: patients,
        person: persons,
        name: person_names,
        phone: person_contacts,
      })
      .from(patients)
      .innerJoin(persons, eq(persons.id, patients.personId))
      .leftJoin(
        person_names,
        and(eq(person_names.personId, persons.id), eq(person_names.isPrimary, true)),
      )
      .leftJoin(
        person_contacts,
        and(
          eq(person_contacts.personId, persons.id),
          eq(person_contacts.system, "phone"),
          eq(person_contacts.isPrimary, true),
        ),
      )
      .where(and(...conditions))
      .orderBy(desc(patients.createdAt))
      .limit(query.count)
      .offset(query.offset);

    const entries: Array<{ resource: any }> = rows.map((row) => ({
      resource: mapPatientResource({
        id: row.patient.id,
        active: row.patient.status === "active",
        patientId: row.patient.patientId,
        name: row.name,
        telecom: row.phone,
        gender: row.person.gender,
        birthDate: row.person.birthDate,
      }),
    }));

    const includeValues = query.filters._include ?? [];
    if (includeValues.includes("Patient:general-practitioner")) {
      const practitionerUserIds = rows
        .map((row) => row.patient.assignedUserId)
        .filter((v): v is string => Boolean(v));
      if (practitionerUserIds.length) {
        const practitionerUsers = await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
          })
          .from(users)
          .where(inArray(users.id, practitionerUserIds));
        for (const p of practitionerUsers) {
          entries.push({
            resource: mapPractitionerResource({
              id: p.id,
              active: true,
              nameText: [p.firstName, p.lastName].filter(Boolean).join(" "),
            }),
          });
        }
      }
    }

    const revincludeValues = query.filters._revinclude ?? [];
    const patientIds = rows.map((row) => row.patient.id);
    await this.appendRevIncludesForPatient(entries, patientIds, revincludeValues);

    return {
      resourceType: "Bundle",
      type: "searchset",
      total,
      entry: entries,
    };
  }

  public async searchEncounter(query: FhirSearchRequest): Promise<FhirSearchBundle<any>> {
    const conditions: SQL[] = [eq(encounters.facilityId, this.context.facilityId)];
    const idValues = query.filters._id;
    if (idValues?.length) conditions.push(inArray(encounters.id, idValues));

    const subjectValues = query.filters.subject?.map((v) => parseTokenFilter(v).value);
    if (subjectValues?.length) conditions.push(inArray(encounters.patientId, subjectValues));

    const statusValues = query.filters.status;
    if (statusValues?.length) conditions.push(eq(encounters.status, statusValues[0] as any));

    const classValues = query.filters.class;
    if (classValues?.length) conditions.push(ilike(encounters.encounterType, `%${classValues[0]}%`));

    const dateToken = query.filters.date?.[0];
    if (dateToken) {
      const parsed = parseDateFilterToken(dateToken);
      if (parsed.op === "eq") conditions.push(eq(encounters.encounterAt, parsed.value));
      if (parsed.op === "ge" || parsed.op === "gt")
        conditions.push(gte(encounters.encounterAt, parsed.value));
      if (parsed.op === "le" || parsed.op === "lt")
        conditions.push(lte(encounters.encounterAt, parsed.value));
    }

    const rows = await db
      .select()
      .from(encounters)
      .where(and(...conditions))
      .orderBy(desc(encounters.encounterAt))
      .limit(query.count)
      .offset(query.offset);

    const entries: Array<{ resource: any }> = rows.map((row) => ({
      resource: mapEncounterResource({
        id: row.id,
        status: row.status,
        encounterType: row.encounterType,
        patientId: row.patientId,
        encounterAt: row.encounterAt,
        reason: row.reason,
      }),
    }));

    const includeValues = query.filters._include ?? [];
    if (includeValues.includes("Encounter:subject")) {
      const patientMap = await this.buildPatientResourceMap(rows.map((r) => r.patientId));
      for (const patient of patientMap.values()) {
        entries.push({ resource: patient });
      }
    }

    return {
      resourceType: "Bundle",
      type: "searchset",
      total: rows.length,
      entry: entries,
    };
  }

  public async searchAllergyIntolerance(
    query: FhirSearchRequest,
  ): Promise<FhirSearchBundle<any>> {
    const patientIdsFilter = query.filters.patient?.map((s) => parseTokenFilter(s).value);
    const codeFilters = query.filters.code?.map((v) => v.toLowerCase()) ?? [];

    let rows = await db
      .select({
        id: histories.id,
        patientId: encounters.patientId,
        encounterId: histories.encounterId,
        createdAt: histories.createdAt,
        text: histories.medication,
      })
      .from(histories)
      .innerJoin(encounters, eq(encounters.id, histories.encounterId))
      .where(eq(encounters.facilityId, this.context.facilityId))
      .limit(5000);

    rows = rows.filter((row) => row.text && row.text.trim().length > 0);
    if (patientIdsFilter?.length) {
      rows = rows.filter((row) => patientIdsFilter.includes(row.patientId));
    }
    if (codeFilters.length) {
      rows = rows.filter((row) =>
        codeFilters.some((code) => row.text.toLowerCase().includes(code)),
      );
    }

    const entries = rows.slice(query.offset, query.offset + query.count).map((row) => ({
      resource: mapAllergyIntoleranceResource({
        id: row.id,
        patientId: row.patientId,
        encounterId: row.encounterId,
        codeText: row.text,
        recordedDate: row.createdAt,
      }),
    }));

    return {
      resourceType: "Bundle",
      type: "searchset",
      total: rows.length,
      entry: entries,
    };
  }

  public async searchObservation(
    query: FhirSearchRequest,
  ): Promise<FhirSearchBundle<any>> {
    const patientIdsFilter = query.filters.subject?.map((s) => parseTokenFilter(s).value);
    const codeFilters = query.filters.code?.map((c) => c.toLowerCase()) ?? [];
    const dateFilter = query.filters.date?.[0]
      ? parseDateFilterToken(query.filters.date[0])
      : undefined;
    const dateFilterDateOnly = dateFilter
      ? dateFilter.value instanceof Date
        ? dateFilter.value.toISOString().slice(0, 10)
        : String(dateFilter.value)
      : undefined;
    const encounterConditions: SQL[] = [eq(encounters.facilityId, this.context.facilityId)];
    if (patientIdsFilter?.length) {
      encounterConditions.push(inArray(encounters.patientId, patientIdsFilter));
    }
    if (dateFilter) {
      if (dateFilter.op === "eq") encounterConditions.push(eq(encounters.encounterAt, dateFilter.value));
      if (dateFilter.op === "ge" || dateFilter.op === "gt")
        encounterConditions.push(gte(encounters.encounterAt, dateFilter.value));
      if (dateFilter.op === "le" || dateFilter.op === "lt")
        encounterConditions.push(lte(encounters.encounterAt, dateFilter.value));
    }

    const testConditions: SQL[] = [eq(tests.deletedAt, null as any)];
    if (codeFilters.length) {
      testConditions.push(
        or(...codeFilters.map((code) => ilike(tests.testName, `%${code}%`)))!,
      );
    }

    const testRows = await db
      .select({
        id: tests.id,
        testName: tests.testName,
        testResult: tests.testResult,
        testCategory: tests.testCategory,
        encounterId: encounters.id,
        patientId: encounters.patientId,
        encounterAt: encounters.encounterAt,
      })
      .from(tests)
      .innerJoin(encounters, eq(encounters.id, tests.encounterId))
      .where(and(...encounterConditions, ...testConditions))
      .orderBy(desc(encounters.encounterAt))
      .limit(5000);

    const vitalMetricCodes = [
      "temperature",
      "pulse",
      "respiratory-rate",
      "spo2",
      "weight",
      "height",
      "vital-panel",
      "vital-signs",
    ];
    const vitalCodeRequested =
      codeFilters.length === 0 ||
      codeFilters.some((filter) =>
        vitalMetricCodes.some(
          (metric) => metric.includes(filter) || filter.includes(metric),
        ),
      );

    const vitalRows = vitalCodeRequested
      ? await db
          .select({
            id: vitals.id,
            temperature: vitals.temperature,
            pulse: vitals.pulse,
            respiratoryRate: vitals.respiratoryRate,
            spo2: vitals.spo2,
            weight: vitals.weight,
            height: vitals.height,
            encounterId: encounters.id,
            patientId: encounters.patientId,
            encounterAt: encounters.encounterAt,
          })
          .from(vitals)
          .innerJoin(encounters, eq(encounters.id, vitals.encounterId))
          .where(and(...encounterConditions, eq(vitals.deletedAt, null as any)))
          .orderBy(desc(encounters.encounterAt))
          .limit(5000)
      : [];

    const maternalMetricCodes = [
      "mother-weight",
      "bp-systolic",
      "bp-diastolic",
      "fetal-heart-rate",
      "mother-pulse",
      "mother-body-temperature",
      "baby-respiration",
      "baby-temperature",
      "maternal-vitals",
      "postnatal-vitals",
    ];
    const maternalCodeRequested =
      codeFilters.length === 0 ||
      codeFilters.some((filter) =>
        maternalMetricCodes.some(
          (metric) => metric.includes(filter) || filter.includes(metric),
        ),
      );

    const ancRows = maternalCodeRequested
      ? await db
          .select({
            id: antenatal_cares.id,
            patientId: antenatal_cares.patientId,
            date: antenatal_cares.ancVisitDate,
            motherWeight: antenatal_cares.motherWeight,
            systolic: antenatal_cares.systolic,
            diastolic: antenatal_cares.diastolic,
            heartRate: antenatal_cares.heartRate,
          })
          .from(antenatal_cares)
          .innerJoin(
            pregnancies,
            eq(pregnancies.id, antenatal_cares.pregnancyId),
          )
          .where(
            and(
              eq(pregnancies.facilityId, this.context.facilityId),
              patientIdsFilter?.length
                ? inArray(antenatal_cares.patientId, patientIdsFilter)
                : undefined,
              dateFilter
                ? dateFilter.op === "eq"
                  ? eq(antenatal_cares.ancVisitDate, dateFilterDateOnly!)
                  : dateFilter.op === "ge" || dateFilter.op === "gt"
                    ? gte(antenatal_cares.ancVisitDate, dateFilterDateOnly!)
                    : lte(antenatal_cares.ancVisitDate, dateFilterDateOnly!)
                : undefined,
            ),
          )
          .limit(5000)
      : [];

    const homeMotherRows = maternalCodeRequested
      ? await db
          .select({
            id: home_mother_postnatal_cares.id,
            patientId: home_mother_postnatal_cares.patientId,
            date: home_mother_postnatal_cares.visitDate,
            pulse: home_mother_postnatal_cares.pulse,
            bodyTemperature: home_mother_postnatal_cares.bodyTemperature,
            bpSystolic: home_mother_postnatal_cares.bpSystolic,
            bpDiastolic: home_mother_postnatal_cares.bpDiastolic,
          })
          .from(home_mother_postnatal_cares)
          .innerJoin(
            pregnancies,
            eq(pregnancies.id, home_mother_postnatal_cares.pregnancyId),
          )
          .where(
            and(
              eq(pregnancies.facilityId, this.context.facilityId),
              patientIdsFilter?.length
                ? inArray(home_mother_postnatal_cares.patientId, patientIdsFilter)
                : undefined,
              dateFilter
                ? dateFilter.op === "eq"
                  ? eq(home_mother_postnatal_cares.visitDate, dateFilter.value)
                  : dateFilter.op === "ge" || dateFilter.op === "gt"
                    ? gte(home_mother_postnatal_cares.visitDate, dateFilter.value)
                    : lte(home_mother_postnatal_cares.visitDate, dateFilter.value)
                : undefined,
            ),
          )
          .limit(5000)
      : [];

    const homeBabyRows = maternalCodeRequested
      ? await db
          .select({
            id: home_baby_postnatal_cares.id,
            patientId: home_baby_postnatal_cares.patientId,
            date: home_baby_postnatal_cares.visitDate,
            respiration: home_baby_postnatal_cares.respiration,
            temperature: home_baby_postnatal_cares.temperature,
          })
          .from(home_baby_postnatal_cares)
          .innerJoin(
            pregnancies,
            eq(pregnancies.id, home_baby_postnatal_cares.pregnancyId),
          )
          .where(
            and(
              eq(pregnancies.facilityId, this.context.facilityId),
              patientIdsFilter?.length
                ? inArray(home_baby_postnatal_cares.patientId, patientIdsFilter)
                : undefined,
              dateFilter
                ? dateFilter.op === "eq"
                  ? eq(home_baby_postnatal_cares.visitDate, dateFilter.value)
                  : dateFilter.op === "ge" || dateFilter.op === "gt"
                    ? gte(home_baby_postnatal_cares.visitDate, dateFilter.value)
                    : lte(home_baby_postnatal_cares.visitDate, dateFilter.value)
                : undefined,
            ),
          )
          .limit(5000)
      : [];

    const growthMetricCodes = [
      "child-weight",
      "child-height",
      "child-muac",
      "child-growth-panel",
    ];
    const growthCodeRequested =
      codeFilters.length === 0 ||
      codeFilters.some((filter) =>
        growthMetricCodes.some(
          (metric) => metric.includes(filter) || filter.includes(metric),
        ),
      );

    const growthRows = growthCodeRequested
      ? await db
          .select({
            id: growths.id,
            patientId: growths.patientId,
            date: growths.date,
            weight: growths.weight,
            height: growths.height,
            muac: growths.muac,
          })
          .from(growths)
          .innerJoin(patients, eq(patients.id, growths.patientId))
          .where(
            and(
              eq(patients.facilityId, this.context.facilityId),
              patientIdsFilter?.length
                ? inArray(growths.patientId, patientIdsFilter)
                : undefined,
              dateFilter
                ? dateFilter.op === "eq"
                  ? eq(growths.date, dateFilter.value)
                  : dateFilter.op === "ge" || dateFilter.op === "gt"
                    ? gte(growths.date, dateFilter.value)
                    : lte(growths.date, dateFilter.value)
                : undefined,
            ),
          )
          .limit(5000)
      : [];

    let combined = [
      ...testRows.map((row) => ({
        encounterAt: row.encounterAt,
        resource: mapObservationResource("ObservationLab", {
          resourceType: "Observation",
          id: row.id,
          status: "final",
          category: [{ text: row.testCategory }],
          code: { text: row.testName },
          subject: { reference: `Patient/${row.patientId}` },
          encounter: { reference: `Encounter/${row.encounterId}` },
          effectiveDateTime: row.encounterAt,
          valueString: row.testResult,
        }),
      })),
      ...vitalRows.map((row) => ({
        encounterAt: row.encounterAt,
        resource: mapObservationResource("ObservationVital", {
          resourceType: "Observation",
          id: row.id,
          status: "final",
          category: [{ text: "vital-signs" }],
          code: { text: "vital-panel" },
          subject: { reference: `Patient/${row.patientId}` },
          encounter: { reference: `Encounter/${row.encounterId}` },
          effectiveDateTime: row.encounterAt,
          component: [
            { code: { text: "temperature" }, valueQuantity: { value: row.temperature, unit: "C" } },
            { code: { text: "pulse" }, valueQuantity: { value: row.pulse, unit: "/min" } },
            { code: { text: "respiratory-rate" }, valueQuantity: { value: row.respiratoryRate, unit: "/min" } },
            { code: { text: "spo2" }, valueQuantity: { value: row.spo2, unit: "%" } },
            { code: { text: "weight" }, valueQuantity: { value: row.weight, unit: "kg" } },
            { code: { text: "height" }, valueQuantity: { value: row.height, unit: "cm" } },
          ],
        }),
      })),
      ...ancRows.map((row) => ({
        encounterAt: row.date ?? new Date(0),
        resource: mapObservationResource("ObservationMaternal", {
          resourceType: "Observation",
          id: `anc-${row.id}`,
          status: "final",
          category: [{ text: "maternal-health" }],
          code: { text: "maternal-vitals" },
          subject: { reference: `Patient/${row.patientId}` },
          effectiveDateTime: row.date,
          component: [
            {
              code: { text: "mother-weight" },
              valueQuantity: { value: row.motherWeight, unit: "kg" },
            },
            { code: { text: "bp-systolic" }, valueQuantity: { value: row.systolic, unit: "mmHg" } },
            { code: { text: "bp-diastolic" }, valueQuantity: { value: row.diastolic, unit: "mmHg" } },
            { code: { text: "fetal-heart-rate" }, valueQuantity: { value: row.heartRate, unit: "/min" } },
          ],
        }),
      })),
      ...homeMotherRows.map((row) => ({
        encounterAt: row.date,
        resource: mapObservationResource("ObservationMaternal", {
          resourceType: "Observation",
          id: `home-mother-${row.id}`,
          status: "final",
          category: [{ text: "postnatal-mother" }],
          code: { text: "postnatal-vitals" },
          subject: { reference: `Patient/${row.patientId}` },
          effectiveDateTime: row.date,
          component: [
            { code: { text: "mother-pulse" }, valueQuantity: { value: row.pulse, unit: "/min" } },
            { code: { text: "mother-body-temperature" }, valueQuantity: { value: row.bodyTemperature, unit: "C" } },
            { code: { text: "bp-systolic" }, valueQuantity: { value: row.bpSystolic, unit: "mmHg" } },
            { code: { text: "bp-diastolic" }, valueQuantity: { value: row.bpDiastolic, unit: "mmHg" } },
          ],
        }),
      })),
      ...homeBabyRows.map((row) => ({
        encounterAt: row.date,
        resource: mapObservationResource("ObservationMaternal", {
          resourceType: "Observation",
          id: `home-baby-${row.id}`,
          status: "final",
          category: [{ text: "postnatal-baby" }],
          code: { text: "baby-vitals" },
          subject: { reference: `Patient/${row.patientId}` },
          effectiveDateTime: row.date,
          component: [
            { code: { text: "baby-respiration" }, valueQuantity: { value: row.respiration, unit: "/min" } },
            { code: { text: "baby-temperature" }, valueQuantity: { value: row.temperature, unit: "C" } },
          ],
        }),
      })),
      ...growthRows.map((row) => ({
        encounterAt: row.date,
        resource: mapObservationResource("ObservationGrowth", {
          resourceType: "Observation",
          id: `growth-${row.id}`,
          status: "final",
          category: [{ text: "child-growth" }],
          code: { text: "child-growth-panel" },
          subject: { reference: `Patient/${row.patientId}` },
          effectiveDateTime: row.date,
          component: [
            { code: { text: "child-weight" }, valueQuantity: { value: row.weight, unit: "kg" } },
            { code: { text: "child-height" }, valueQuantity: { value: row.height, unit: "cm" } },
            { code: { text: "child-muac" }, valueQuantity: { value: row.muac, unit: "cm" } },
          ],
        }),
      })),
    ];

    if (codeFilters.length) {
      combined = combined.filter((row) => {
        const codeText = String(row.resource?.code?.text ?? "").toLowerCase();
        const componentCodes = Array.isArray(row.resource?.component)
          ? row.resource.component
              .map((c: any) => String(c?.code?.text ?? "").toLowerCase())
              .filter(Boolean)
          : [];
        return codeFilters.some(
          (filter) =>
            codeText.includes(filter) ||
            componentCodes.some((componentCode: string) =>
              componentCode.includes(filter),
            ),
        );
      });
    }

    const paged = combined
      .sort((a, b) => +new Date(b.encounterAt) - +new Date(a.encounterAt))
      .slice(query.offset, query.offset + query.count)
      .map((row) => ({ resource: row.resource }));

    return {
      resourceType: "Bundle",
      type: "searchset",
      total: combined.length,
      entry: paged,
    };
  }

  public async searchCondition(query: FhirSearchRequest): Promise<FhirSearchBundle<any>> {
    const patientIdsFilter = query.filters.subject?.map((s) => parseTokenFilter(s).value);
    const codeFilters = query.filters.code?.map((c) => c.toLowerCase()) ?? [];
    const recordedDateToken = query.filters["recorded-date"]?.[0] ?? query.filters.date?.[0];
    const recordedDateFilter = recordedDateToken
      ? parseDateFilterToken(recordedDateToken)
      : undefined;

    const basePatientScope: SQL[] = [eq(patients.facilityId, this.context.facilityId)];
    if (patientIdsFilter?.length) {
      basePatientScope.push(inArray(patients.id, patientIdsFilter));
    }

    const provisionalConditions: SQL[] = [];
    if (codeFilters.length) {
      provisionalConditions.push(
        or(
          ...codeFilters.map((code) =>
            ilike(provisional_diagnoses.description, `%${code}%`),
          ),
        )!,
      );
    }
    if (recordedDateFilter) {
      if (recordedDateFilter.op === "eq")
        provisionalConditions.push(eq(provisional_diagnoses.createdAt, recordedDateFilter.value));
      if (recordedDateFilter.op === "ge" || recordedDateFilter.op === "gt")
        provisionalConditions.push(gte(provisional_diagnoses.createdAt, recordedDateFilter.value));
      if (recordedDateFilter.op === "le" || recordedDateFilter.op === "lt")
        provisionalConditions.push(lte(provisional_diagnoses.createdAt, recordedDateFilter.value));
    }

    const confirmedConditions: SQL[] = [];
    if (codeFilters.length) {
      confirmedConditions.push(
        or(
          ...codeFilters.map((code) =>
            or(
              ilike(confirm_diagnoses.description, `%${code}%`),
              ilike(confirm_diagnoses.icdCode, `%${code}%`),
            )!,
          ),
        )!,
      );
    }
    if (recordedDateFilter) {
      if (recordedDateFilter.op === "eq")
        confirmedConditions.push(eq(confirm_diagnoses.createdAt, recordedDateFilter.value));
      if (recordedDateFilter.op === "ge" || recordedDateFilter.op === "gt")
        confirmedConditions.push(gte(confirm_diagnoses.createdAt, recordedDateFilter.value));
      if (recordedDateFilter.op === "le" || recordedDateFilter.op === "lt")
        confirmedConditions.push(lte(confirm_diagnoses.createdAt, recordedDateFilter.value));
    }

    const [provisionalRows, confirmedRows] = await Promise.all([
      db
        .select()
        .from(provisional_diagnoses)
        .innerJoin(patients, eq(patients.id, provisional_diagnoses.patientId))
        .where(and(...basePatientScope, ...provisionalConditions))
        .limit(5000),
      db
        .select()
        .from(confirm_diagnoses)
        .innerJoin(patients, eq(patients.id, confirm_diagnoses.patientId))
        .where(and(...basePatientScope, ...confirmedConditions))
        .limit(5000),
    ]);

    const combined = [
      ...provisionalRows.map((row) => ({
        patientId: row.provisional_diagnoses.patientId,
        resource: mapConditionResource({
          id: row.provisional_diagnoses.id,
          patientId: row.provisional_diagnoses.patientId,
          encounterId: row.provisional_diagnoses.encounterId,
          recordedDate: row.provisional_diagnoses.createdAt,
          description: row.provisional_diagnoses.description,
          verificationStatus: "provisional",
        }),
      })),
      ...confirmedRows.map((row) => ({
        patientId: row.confirm_diagnoses.patientId,
        resource: mapConditionResource({
          id: row.confirm_diagnoses.id,
          patientId: row.confirm_diagnoses.patientId,
          encounterId: row.confirm_diagnoses.encounterId,
          recordedDate: row.confirm_diagnoses.createdAt,
          description: row.confirm_diagnoses.description,
          verificationStatus: "confirmed",
          icdCode: row.confirm_diagnoses.icdCode,
        }),
      })),
    ];

    const paged = combined
      .slice(query.offset, query.offset + query.count)
      .map((row) => ({ resource: row.resource }));

    const includeValues = query.filters._include ?? [];
    if (includeValues.includes("Condition:subject")) {
      const patientMap = await this.buildPatientResourceMap(
        combined.map((row) => row.patientId),
      );
      for (const patient of patientMap.values()) {
        paged.push({ resource: patient });
      }
    }

    return {
      resourceType: "Bundle",
      type: "searchset",
      total: combined.length,
      entry: paged,
    };
  }

  public async searchMedicationRequest(
    query: FhirSearchRequest,
  ): Promise<FhirSearchBundle<any>> {
    const patientIdsFilter = query.filters.subject?.map((s) => parseTokenFilter(s).value);
    const nameFilters = query.filters.code?.map((v) => v.toLowerCase()) ?? [];

    let rows = await db.select().from(medications).limit(5000);
    if (patientIdsFilter?.length) {
      rows = rows.filter((row) => patientIdsFilter.includes(row.patientId));
    }
    if (nameFilters.length) {
      rows = rows.filter((row) =>
        nameFilters.some((name) =>
          (row.medicineName ?? "").toLowerCase().includes(name),
        ),
      );
    }

    const paged = rows.slice(query.offset, query.offset + query.count).map((row) => ({
      resource: mapMedicationRequestResource({
        id: row.id,
        patientId: row.patientId,
        encounterId: row.encounterId,
        medicineName: row.medicineName,
        authoredOn: row.createdAt,
        dosageText: [row.dosage, row.times, row.route, row.beforeAfter, row.duration]
          .filter(Boolean)
          .join(" "),
      }),
    }));

    return {
      resourceType: "Bundle",
      type: "searchset",
      total: rows.length,
      entry: paged,
    };
  }

  public async searchAppointment(query: FhirSearchRequest): Promise<FhirSearchBundle<any>> {
    const conditions: SQL[] = [eq(appointments.facilityId, this.context.facilityId)];

    const idValues = query.filters._id;
    if (idValues?.length) conditions.push(inArray(appointments.id, idValues));

    const patientValues = query.filters.patient?.map((v) => parseTokenFilter(v).value);
    if (patientValues?.length) conditions.push(inArray(appointments.patientId, patientValues));

    const practitionerValues = query.filters.practitioner?.map((v) =>
      parseTokenFilter(v).value,
    );
    if (practitionerValues?.length)
      conditions.push(inArray(appointments.doctorId, practitionerValues));

    const statusValues = query.filters.status;
    if (statusValues?.length) conditions.push(eq(appointments.status, statusValues[0] as any));

    const dateToken = query.filters.date?.[0];
    if (dateToken) {
      const parsed = parseDateFilterToken(dateToken);

      const dateValue = format(parsed.value, "yyyy-MM-dd");
      if (parsed.op === "eq") conditions.push(eq(appointments.date, dateValue));
      if (parsed.op === "ge" || parsed.op === "gt")
        conditions.push(gte(appointments.date, dateValue));
      if (parsed.op === "le" || parsed.op === "lt")
        conditions.push(lte(appointments.date, dateValue));
    }

    const rows = await db
      .select()
      .from(appointments)
      .where(and(...conditions))
      .orderBy(desc(appointments.date))
      .limit(query.count)
      .offset(query.offset);

    const entries: Array<{ resource: any }> = rows.map((row) => ({
      resource: mapAppointmentResource({
        id: row.id,
        status: row.status,
        service: row.service,
        start: row.date,
        patientId: row.patientId,
        doctorId: row.doctorId,
      }),
    }));

    const includeValues = query.filters._include ?? [];
    if (includeValues.includes("Appointment:patient")) {
      const patientMap = await this.buildPatientResourceMap(rows.map((r) => r.patientId));
      for (const patient of patientMap.values()) {
        entries.push({ resource: patient });
      }
    }

    return {
      resourceType: "Bundle",
      type: "searchset",
      total: rows.length,
      entry: entries,
    };
  }

  public async searchOrganization(query: FhirSearchRequest): Promise<FhirSearchBundle<any>> {
    const conditions: SQL[] = [];

    const idValues = query.filters._id;
    if (idValues?.length) conditions.push(inArray(health_facilities.id, idValues));

    const nameValues = query.filters.name;
    if (nameValues?.length) {
      conditions.push(
        or(...nameValues.map((value) => ilike(health_facilities.name, `%${value}%`)))!,
      );
    }

    const identifierValues = query.filters.identifier?.map(parseTokenFilter) ?? [];
    if (identifierValues.length) {
      conditions.push(
        or(
          ...identifierValues.map((token) =>
            ilike(health_facilities.hfCode, `%${token.value}%`),
          ),
        )!,
      );
    }

    const rows = await db
      .select()
      .from(health_facilities)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(health_facilities.createdAt))
      .limit(query.count)
      .offset(query.offset);

    return {
      resourceType: "Bundle",
      type: "searchset",
      total: rows.length,
      entry: rows.map((row) => ({
        resource: mapOrganizationResource({
          id: row.id,
          name: row.name,
          active: !row.deletedAt,
          hfCode: row.hfCode,
          phone: row.phone,
          email: row.email,
          address: row.address,
          ward: row.ward,
          palika: row.palika,
          district: row.district,
          province: row.province,
        }),
      })),
    };
  }

  public async searchPractitionerRole(
    query: FhirSearchRequest,
  ): Promise<FhirSearchBundle<any>> {
    const conditions: SQL[] = [];

    const idValues = query.filters._id;
    if (idValues?.length)
      conditions.push(inArray(practitioner_role_assignments.id, idValues));

    const practitionerValues = query.filters.practitioner?.map((v) =>
      parseTokenFilter(v).value,
    );
    if (practitionerValues?.length)
      conditions.push(inArray(practitioner_role_assignments.practitionerId, practitionerValues));

    const organizationValues = query.filters.organization?.map((v) =>
      parseTokenFilter(v).value,
    );
    if (organizationValues?.length)
      conditions.push(inArray(practitioner_role_assignments.facilityId, organizationValues));

    const roleValues = query.filters.role;
    if (roleValues?.length) {
      conditions.push(
        or(
          ...roleValues.map((value) =>
            ilike(practitioner_role_assignments.roleCode, `%${value}%`),
          ),
        )!,
      );
    }

    const specialtyValues = query.filters.specialty;
    if (specialtyValues?.length) {
      conditions.push(
        or(
          ...specialtyValues.map((value) =>
            ilike(practitioner_role_assignments.specialty, `%${value}%`),
          ),
        )!,
      );
    }

    const rows = await db
      .select()
      .from(practitioner_role_assignments)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(practitioner_role_assignments.createdAt))
      .limit(query.count)
      .offset(query.offset);

    const entries: Array<{ resource: any }> = rows.map((row) => ({
      resource: mapPractitionerRoleResource({
        id: row.id,
        practitionerId: row.practitionerId,
        roleCode: row.roleCode,
        specialty: row.specialty,
        organizationId: row.facilityId,
        active: row.active,
      }),
    }));

    const includeValues = query.filters._include ?? [];
    if (includeValues.includes("PractitionerRole:practitioner")) {
      const practitionerMap = await this.buildPractitionerResourceMap(
        rows.map((row) => row.practitionerId),
      );
      for (const practitioner of practitionerMap.values()) {
        entries.push({ resource: practitioner });
      }
    }
    if (includeValues.includes("PractitionerRole:organization")) {
      const orgIds = rows
        .map((row) => row.facilityId)
        .filter((v): v is string => Boolean(v));
      const organizationMap = await this.buildOrganizationResourceMap(orgIds);
      for (const organization of organizationMap.values()) {
        entries.push({ resource: organization });
      }
    }

    return {
      resourceType: "Bundle",
      type: "searchset",
      total: rows.length,
      entry: entries,
    };
  }

  public async searchDocumentReference(
    query: FhirSearchRequest,
  ): Promise<FhirSearchBundle<any>> {
    const conditions: SQL[] = [eq(attachments.facilityId, this.context.facilityId)];
    const idValues = query.filters._id;
    if (idValues?.length) conditions.push(inArray(attachments.id, idValues));

    const sourceTypeValues = query.filters.type;
    if (sourceTypeValues?.length) {
      conditions.push(
        or(
          ...sourceTypeValues.map((value) =>
            ilike(attachments.sourceType, `%${value}%`),
          ),
        )!,
      );
    }

    const dateToken = query.filters.date?.[0];
    if (dateToken) {
      const parsed = parseDateFilterToken(dateToken);
      if (parsed.op === "eq") conditions.push(eq(attachments.createdAt, parsed.value));
      if (parsed.op === "ge" || parsed.op === "gt")
        conditions.push(gte(attachments.createdAt, parsed.value));
      if (parsed.op === "le" || parsed.op === "lt")
        conditions.push(lte(attachments.createdAt, parsed.value));
    }

    const patientValues = query.filters.patient?.map((v) => parseTokenFilter(v).value);
    if (patientValues?.length) {
      const [visitRows, encounterRows, fpRows] = await Promise.all([
        db.select({ id: visits.id }).from(visits).where(inArray(visits.patientId, patientValues)),
        db
          .select({ id: encounters.id })
          .from(encounters)
          .where(inArray(encounters.patientId, patientValues)),
        db
          .select({ id: family_plannings.id })
          .from(family_plannings)
          .where(inArray(family_plannings.patientId, patientValues)),
      ]);
      const patientDirectClause = and(
        eq(attachments.sourceType, "Patient"),
        inArray(attachments.sourceId, patientValues),
      );
      const visitClause = visitRows.length
        ? and(
            eq(attachments.sourceType, "Visit"),
            inArray(
              attachments.sourceId,
              visitRows.map((v) => v.id),
            ),
          )
        : undefined;
      const encounterClause = encounterRows.length
        ? and(
            eq(attachments.sourceType, "Encounter"),
            inArray(
              attachments.sourceId,
              encounterRows.map((v) => v.id),
            ),
          )
        : undefined;
      const familyPlanningClause = fpRows.length
        ? and(
            eq(attachments.sourceType, "FamilyPlanning"),
            inArray(
              attachments.sourceId,
              fpRows.map((v) => v.id),
            ),
          )
        : undefined;
      const subjectClauses = [
        patientDirectClause,
        visitClause,
        encounterClause,
        familyPlanningClause,
      ].filter(Boolean) as SQL[];
      if (subjectClauses.length) {
        conditions.push(or(...subjectClauses)!);
      }
    }

    const rows = await db
      .select()
      .from(attachments)
      .where(and(...conditions))
      .orderBy(desc(attachments.createdAt))
      .limit(query.count)
      .offset(query.offset);

    const patientIdsBySource = new Map<string, string>();
    for (const row of rows) {
      if (row.sourceType === "Patient") {
        patientIdsBySource.set(`Patient:${row.sourceId}`, row.sourceId);
      }
    }

    const visitSourceIds = rows
      .filter((row) => row.sourceType === "Visit")
      .map((row) => row.sourceId);
    const encounterSourceIds = rows
      .filter((row) => row.sourceType === "Encounter")
      .map((row) => row.sourceId);
    const familyPlanningSourceIds = rows
      .filter((row) => row.sourceType === "FamilyPlanning")
      .map((row) => row.sourceId);

    if (visitSourceIds.length) {
      const visitRows = await db
        .select({ id: visits.id, patientId: visits.patientId })
        .from(visits)
        .where(inArray(visits.id, visitSourceIds));
      for (const visitRow of visitRows) {
        patientIdsBySource.set(`Visit:${visitRow.id}`, visitRow.patientId);
      }
    }

    if (encounterSourceIds.length) {
      const encounterRows = await db
        .select({ id: encounters.id, patientId: encounters.patientId })
        .from(encounters)
        .where(inArray(encounters.id, encounterSourceIds));
      for (const encounterRow of encounterRows) {
        patientIdsBySource.set(
          `Encounter:${encounterRow.id}`,
          encounterRow.patientId,
        );
      }
    }

    if (familyPlanningSourceIds.length) {
      const fpRows = await db
        .select({ id: family_plannings.id, patientId: family_plannings.patientId })
        .from(family_plannings)
        .where(inArray(family_plannings.id, familyPlanningSourceIds));
      for (const fpRow of fpRows) {
        patientIdsBySource.set(`FamilyPlanning:${fpRow.id}`, fpRow.patientId);
      }
    }

    const entries = rows.map((row) => ({
      resource: mapDocumentReferenceResource({
        id: row.id,
        sourceType: row.sourceType,
        sourceId: row.sourceId,
        fileUrl: row.fileUrl,
        name: row.name,
        fileType: row.fileType,
        fileSize: row.fileSize,
        createdAt: row.createdAt,
        patientId:
          patientIdsBySource.get(`${row.sourceType}:${row.sourceId}`) ?? undefined,
      }),
    }));

    return {
      resourceType: "Bundle",
      type: "searchset",
      total: rows.length,
      entry: entries,
    };
  }

  public async searchEpisodeOfCare(
    query: FhirSearchRequest,
  ): Promise<FhirSearchBundle<any>> {
    const pregnancyConditions: SQL[] = [eq(pregnancies.facilityId, this.context.facilityId)];
    const familyPlanningConditions: SQL[] = [
      eq(family_plannings.facilityId, this.context.facilityId),
    ];

    const idValues = query.filters._id;
    if (idValues?.length) {
      pregnancyConditions.push(inArray(pregnancies.id, idValues));
      familyPlanningConditions.push(inArray(family_plannings.id, idValues));
    }

    const patientValues = query.filters.patient?.map((v) => parseTokenFilter(v).value);
    if (patientValues?.length) {
      pregnancyConditions.push(inArray(pregnancies.patientId, patientValues));
      familyPlanningConditions.push(inArray(family_plannings.patientId, patientValues));
    }

    const dateToken = query.filters.date?.[0];
    if (dateToken) {
      const parsed = parseDateFilterToken(dateToken);
      const dateOnly =
        parsed.value instanceof Date
          ? parsed.value.toISOString().slice(0, 10)
          : String(parsed.value);
      if (parsed.op === "eq") {
        pregnancyConditions.push(eq(pregnancies.firstVisit, dateOnly));
        familyPlanningConditions.push(
          eq(family_plannings.serviceDate, dateOnly),
        );
      }
      if (parsed.op === "ge" || parsed.op === "gt") {
        pregnancyConditions.push(gte(pregnancies.firstVisit, dateOnly));
        familyPlanningConditions.push(
          gte(family_plannings.serviceDate, dateOnly),
        );
      }
      if (parsed.op === "le" || parsed.op === "lt") {
        pregnancyConditions.push(lte(pregnancies.firstVisit, dateOnly));
        familyPlanningConditions.push(
          lte(family_plannings.serviceDate, dateOnly),
        );
      }
    }

    const [pregnancyRows, familyPlanningRows] = await Promise.all([
      db.select().from(pregnancies).where(and(...pregnancyConditions)).limit(5000),
      db
        .select()
        .from(family_plannings)
        .where(and(...familyPlanningConditions))
        .limit(5000),
    ]);

    const todayIso = new Date().toISOString().slice(0, 10);
    const episodes = [
      ...pregnancyRows.map((row) => ({
        resource: mapEpisodeOfCareResource({
          id: row.id,
          patientId: row.patientId,
          status:
            row.expectedDeliveryDate && row.expectedDeliveryDate < todayIso
              ? "finished"
              : "active",
          start: new Date(row.firstVisit),
          end: row.expectedDeliveryDate
            ? new Date(row.expectedDeliveryDate)
            : undefined,
          typeText: "Maternal Pregnancy",
        }),
      })),
      ...familyPlanningRows.map((row) => ({
        resource: mapEpisodeOfCareResource({
          id: row.id,
          patientId: row.patientId,
          status: row.deletedAt ? "finished" : "active",
          start: new Date(row.serviceDate),
          typeText: "Family Planning",
        }),
      })),
    ];

    const paged = episodes.slice(query.offset, query.offset + query.count);
    const includeValues = query.filters._include ?? [];
    if (includeValues.includes("EpisodeOfCare:patient")) {
      const patientMap = await this.buildPatientResourceMap(
        paged.map((entry) => entry.resource.patient.reference.replace("Patient/", "")),
      );
      for (const patient of patientMap.values()) {
        paged.push({ resource: patient });
      }
    }

    return {
      resourceType: "Bundle",
      type: "searchset",
      total: episodes.length,
      entry: paged,
    };
  }

  public async searchCarePlan(query: FhirSearchRequest): Promise<FhirSearchBundle<any>> {
    const fpConditions: SQL[] = [eq(family_plannings.facilityId, this.context.facilityId)];
    const pncConditions: SQL[] = [];
    const ancConditions: SQL[] = [];
    const deliveryConditions: SQL[] = [];
    const homeMotherConditions: SQL[] = [];
    const homeBabyConditions: SQL[] = [];

    const patientValues = query.filters.patient?.map((v) => parseTokenFilter(v).value);
    if (patientValues?.length) {
      fpConditions.push(inArray(family_plannings.patientId, patientValues));
      pncConditions.push(inArray(postnatal_cares.patientId, patientValues));
      ancConditions.push(inArray(antenatal_cares.patientId, patientValues));
      deliveryConditions.push(inArray(deliveries.patientId, patientValues));
      homeMotherConditions.push(inArray(home_mother_postnatal_cares.patientId, patientValues));
      homeBabyConditions.push(inArray(home_baby_postnatal_cares.patientId, patientValues));
    }

    const dateToken = query.filters.date?.[0];
    if (dateToken) {
      const parsed = parseDateFilterToken(dateToken);
      const dateOnly =
        parsed.value instanceof Date
          ? parsed.value.toISOString().slice(0, 10)
          : String(parsed.value);
      if (parsed.op === "eq") {
        fpConditions.push(eq(family_plannings.serviceDate, dateOnly));
        pncConditions.push(eq(postnatal_cares.visitDate, dateOnly));
      }
      if (parsed.op === "ge" || parsed.op === "gt") {
        fpConditions.push(gte(family_plannings.serviceDate, dateOnly));
        pncConditions.push(gte(postnatal_cares.visitDate, dateOnly));
        ancConditions.push(gte(antenatal_cares.ancVisitDate, dateOnly));
        deliveryConditions.push(gte(deliveries.deliveryDate, dateOnly));
        homeMotherConditions.push(gte(home_mother_postnatal_cares.visitDate, parsed.value));
        homeBabyConditions.push(gte(home_baby_postnatal_cares.visitDate, parsed.value));
      }
      if (parsed.op === "le" || parsed.op === "lt") {
        fpConditions.push(lte(family_plannings.serviceDate, dateOnly));
        pncConditions.push(lte(postnatal_cares.visitDate, dateOnly));
        ancConditions.push(lte(antenatal_cares.ancVisitDate, dateOnly));
        deliveryConditions.push(lte(deliveries.deliveryDate, dateOnly));
        homeMotherConditions.push(lte(home_mother_postnatal_cares.visitDate, parsed.value));
        homeBabyConditions.push(lte(home_baby_postnatal_cares.visitDate, parsed.value));
      }
    }

    const [fpRows, pncRows, ancRows, deliveryRows, homeMotherRows, homeBabyRows] =
      await Promise.all([
      db.select().from(family_plannings).where(and(...fpConditions)).limit(5000),
      db
        .select()
        .from(postnatal_cares)
        .where(pncConditions.length ? and(...pncConditions) : undefined)
        .limit(5000),
      db
        .select()
        .from(antenatal_cares)
        .where(ancConditions.length ? and(...ancConditions) : undefined)
        .limit(5000),
      db
        .select()
        .from(deliveries)
        .where(deliveryConditions.length ? and(...deliveryConditions) : undefined)
        .limit(5000),
      db
        .select()
        .from(home_mother_postnatal_cares)
        .where(homeMotherConditions.length ? and(...homeMotherConditions) : undefined)
        .limit(5000),
      db
        .select()
        .from(home_baby_postnatal_cares)
        .where(homeBabyConditions.length ? and(...homeBabyConditions) : undefined)
        .limit(5000),
    ]);

    const carePlans = [
      ...fpRows.map((row) => ({
        resource: mapCarePlanResource({
          id: row.id,
          patientId: row.patientId,
          status: row.deletedAt ? "completed" : "active",
          intent: "plan",
          categoryText: "Family Planning",
          title: `Family planning (${row.serviceType})`,
          description: `Service type: ${row.serviceType}`,
          createdAt: row.createdAt,
        }),
      })),
      ...ancRows.map((row) => ({
        resource: mapCarePlanResource({
          id: row.id,
          patientId: row.patientId,
          status: row.deletedAt ? "completed" : "active",
          intent: "plan",
          categoryText: "Antenatal Care",
          title: `ANC visit`,
          description: row.medicalAdvice,
          createdAt: row.createdAt,
        }),
      })),
      ...deliveryRows.map((row) => ({
        resource: mapCarePlanResource({
          id: row.id,
          patientId: row.patientId,
          status: row.deletedAt ? "completed" : "active",
          intent: "order",
          categoryText: "Delivery Care",
          title: `Delivery care`,
          description: row.treatment,
          createdAt: row.createdAt,
        }),
      })),
      ...pncRows.map((row) => ({
        resource: mapCarePlanResource({
          id: row.id,
          patientId: row.patientId,
          status: row.deletedAt ? "completed" : "active",
          intent: "plan",
          categoryText: "Postnatal Care",
          title: `Postnatal care (${row.visitingTime})`,
          description: row.medicalAdvice,
          createdAt: row.createdAt,
        }),
      })),
      ...homeMotherRows.map((row) => ({
        resource: mapCarePlanResource({
          id: row.id,
          patientId: row.patientId,
          status: row.deletedAt ? "completed" : "active",
          intent: "plan",
          categoryText: "Home Mother PNC",
          title: `Home mother postnatal care`,
          description: row.ppHaemorageTreatment,
          createdAt: row.createdAt,
        }),
      })),
      ...homeBabyRows.map((row) => ({
        resource: mapCarePlanResource({
          id: row.id,
          patientId: row.patientId,
          status: row.deletedAt ? "completed" : "active",
          intent: "plan",
          categoryText: "Home Baby PNC",
          title: `Home baby postnatal care`,
          description: row.breastFeeding,
          createdAt: row.createdAt,
        }),
      })),
    ];

    const paged = carePlans.slice(query.offset, query.offset + query.count);
    const includeValues = query.filters._include ?? [];
    if (includeValues.includes("CarePlan:subject")) {
      const patientMap = await this.buildPatientResourceMap(
        paged.map((entry) => entry.resource.subject.reference.replace("Patient/", "")),
      );
      for (const patient of patientMap.values()) {
        paged.push({ resource: patient });
      }
    }

    return {
      resourceType: "Bundle",
      type: "searchset",
      total: carePlans.length,
      entry: paged,
    };
  }

  public async searchImmunization(
    query: FhirSearchRequest,
  ): Promise<FhirSearchBundle<any>> {
    const conditions: SQL[] = [eq(child_immunizations.facilityId, this.context.facilityId)];

    const patientValues = query.filters.patient?.map((v) => parseTokenFilter(v).value);
    if (patientValues?.length) {
      conditions.push(inArray(immunization_histories.patientId, patientValues));
    }

    const vaccineCodeValues = query.filters["vaccine-code"] ?? query.filters.code;
    if (vaccineCodeValues?.length) {
      conditions.push(
        or(
          ...vaccineCodeValues.map((value) =>
            ilike(immunization_histories.vaccineName, `%${value}%`),
          ),
        )!,
      );
    }

    const dateToken = query.filters.date?.[0];
    if (dateToken) {
      const parsed = parseDateFilterToken(dateToken);
      if (parsed.op === "eq") conditions.push(eq(immunization_histories.date, parsed.value));
      if (parsed.op === "ge" || parsed.op === "gt")
        conditions.push(gte(immunization_histories.date, parsed.value));
      if (parsed.op === "le" || parsed.op === "lt")
        conditions.push(lte(immunization_histories.date, parsed.value));
    }

    const rows = await db
      .select({ history: immunization_histories })
      .from(immunization_histories)
      .innerJoin(
        child_immunizations,
        eq(child_immunizations.id, immunization_histories.childImmunizationId),
      )
      .where(and(...conditions))
      .orderBy(desc(immunization_histories.date))
      .limit(query.count)
      .offset(query.offset);

    const entries = rows.map((row) => ({
      resource: mapImmunizationResource({
        id: row.history.id,
        patientId: row.history.patientId,
        vaccineName: row.history.vaccineName,
        occurrence: row.history.vaccinatedDate ?? row.history.date,
        status: row.history.vaccinated ? "completed" : "not-done",
        note: row.history.aefi,
      }),
    }));
    const total = entries.length;

    const includeValues = query.filters._include ?? [];
    if (includeValues.includes("Immunization:patient")) {
      const patientMap = await this.buildPatientResourceMap(
        rows.map((row) => row.history.patientId),
      );
      for (const patient of patientMap.values()) {
        entries.push({ resource: patient });
      }
    }

    return {
      resourceType: "Bundle",
      type: "searchset",
      total,
      entry: entries,
    };
  }
}
