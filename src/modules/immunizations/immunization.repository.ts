import { db } from "../../db";
import {
  aefi_events,
  child_feeding_milestones,
  child_immunizations,
  hpv_school_sessions,
  immunization_campaigns,
  immunization_histories,
  vaccine_doses,
  vaccines,
} from "../../db/schema";
import { FacilityContext } from "../../context/facility-context";
import { FacilityRepository } from "../../core/facility-repository";
import { and, asc, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";

type DbTx = Parameters<Parameters<(typeof db)["transaction"]>[0]>[0];

export type ImmunizationMode =
  | "routine"
  | "campaign"
  | "school"
  | "catch_up"
  | "outbreak_response";

export type VaccineSite =
  | "left_arm"
  | "right_arm"
  | "left_thigh"
  | "right_thigh"
  | "oral"
  | "other";

export type VaccineRoute = "im" | "sc" | "id" | "po" | "nasal" | "other";

export interface ImmunizationDoseInsert {
  vaccineCode?: string | null;
  doseNumber?: number | null;
  vaccineName?: string | null; // legacy fallback when no code
  mode?: ImmunizationMode;
  campaignId?: string | null;
  hpvSessionId?: string | null;
  batchNumber?: string | null;
  diluentBatchNumber?: string | null;
  lotNumber?: string | null;
  expiryDate?: string | null;
  site?: VaccineSite | null;
  route?: VaccineRoute | null;
  administeredBy?: string | null;
  administeredAt?: Date | null;
  nextDoseDueDate?: string | null;
  sourceFacilityName?: string | null;
  vaccinated?: number | null;
  vaccinatedDate?: Date | null;
  date?: Date; // legacy "scheduled" date column
  aefi?: string | null;
}

export class ImmunizationRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, child_immunizations.facilityId);
  }

  // ---------------------------------------------------------------------------
  // Child immunization profile
  // ---------------------------------------------------------------------------

  public async upsertChildImmunizationProfile(params: {
    patientId: string;
    mothersName: string;
    fathersName: string;
    weightAtBirth?: number | null;
    birthOrder?: number | null;
    delayedScheduleStartedAtMonths?: number | null;
    outOfCatchment?: boolean;
    serviceRegistrationNumber?: string | null;
    enrolledFiscalYear?: number | null;
  }) {
    const now = new Date();

    const updated = await db
      .update(child_immunizations)
      .set({
        mothersName: params.mothersName,
        fathersName: params.fathersName,
        weightAtBirth: params.weightAtBirth ?? null,
        birthOrder: params.birthOrder ?? null,
        delayedScheduleStartedAtMonths:
          params.delayedScheduleStartedAtMonths ?? null,
        outOfCatchment: params.outOfCatchment ?? false,
        serviceRegistrationNumber: params.serviceRegistrationNumber ?? null,
        enrolledFiscalYear: params.enrolledFiscalYear ?? null,
        updatedAt: now,
      })
      .where(
        this.withFacilityScope(
          and(
            eq(child_immunizations.patientId, params.patientId),
            isNull(child_immunizations.deletedAt),
          ),
        ),
      )
      .returning();

    if (updated[0]) return updated[0];

    const inserted = await db
      .insert(child_immunizations)
      .values({
        patientId: params.patientId,
        facilityId: this.context.facilityId,
        mothersName: params.mothersName,
        fathersName: params.fathersName,
        weightAtBirth: params.weightAtBirth ?? null,
        birthOrder: params.birthOrder ?? null,
        delayedScheduleStartedAtMonths:
          params.delayedScheduleStartedAtMonths ?? null,
        outOfCatchment: params.outOfCatchment ?? false,
        serviceRegistrationNumber: params.serviceRegistrationNumber ?? null,
        enrolledFiscalYear: params.enrolledFiscalYear ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return inserted[0] ?? null;
  }

  public async findChildImmunizationByPatient(patientId: string) {
    const rows = await db
      .select()
      .from(child_immunizations)
      .where(
        this.withFacilityScope(
          and(
            eq(child_immunizations.patientId, patientId),
            isNull(child_immunizations.deletedAt),
          ),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  // ---------------------------------------------------------------------------
  // Dose recording (legacy single + batch)
  // ---------------------------------------------------------------------------

  /**
   * Back-compat single-dose path used by the existing service. Kept verbatim
   * so old callers don't break; new code should use `createImmunizationHistoryBatch`.
   */
  public async createImmunizationHistoryForPatient(
    tx: DbTx,
    params: {
      patientId: string;
      visitId: string;
      encounterId: string;
      vaccineName: string;
      date: Date;
      vaccinated: number | null;
      vaccinatedDate: Date | null;
      aefi?: string | null;
      createdBy: string;
      updatedBy: string;
    },
  ) {
    const result = await tx.execute<
      typeof immunization_histories.$inferSelect
    >(sql`
      insert into immunization_histories (
        vaccine_name,
        date,
        vaccinated,
        aefi,
        vaccinated_date,
        patient_id,
        visit_id,
        encounter_id,
        child_immunization_id,
        facility_id,
        created_by,
        updated_by
      )
      select
        ${params.vaccineName},
        ${params.date},
        ${params.vaccinated},
        ${params.aefi ?? null},
        ${params.vaccinatedDate},
        ${params.patientId}::uuid,
        ${params.visitId}::uuid,
        ${params.encounterId}::uuid,
        ci.id,
        ${this.context.facilityId}::uuid,
        ${params.createdBy}::uuid,
        ${params.updatedBy}::uuid
      from child_immunizations ci
      where ci.patient_id = ${params.patientId}::uuid
        and ci.facility_id = ${this.context.facilityId}::uuid
        and ci.deleted_at is null
      limit 1
      returning *
    `);

    return result.rows[0] ?? null;
  }

  /**
   * Insert N dose rows in a single transaction. Caller has already
   * (a) validated each entry against the catalog and
   * (b) deduplicated within the batch and against existing rows.
   */
  public async createImmunizationHistoryBatch(
    tx: DbTx,
    params: {
      patientId: string;
      visitId: string;
      encounterId: string;
      childImmunizationId: string;
      createdBy: string;
      updatedBy: string;
      doses: ImmunizationDoseInsert[];
    },
  ) {
    if (params.doses.length === 0) return [];

    const rows = params.doses.map((d) => ({
      patientId: params.patientId,
      visitId: params.visitId,
      encounterId: params.encounterId,
      childImmunizationId: params.childImmunizationId,
      facilityId: this.context.facilityId,
      createdBy: params.createdBy,
      updatedBy: params.updatedBy,
      // legacy columns
      vaccineName: d.vaccineName ?? d.vaccineCode ?? "UNKNOWN",
      date: d.date ?? d.administeredAt ?? new Date(),
      vaccinated: d.vaccinated ?? 1,
      vaccinatedDate: d.vaccinatedDate ?? d.administeredAt ?? new Date(),
      aefi: d.aefi ?? null,
      // HMIS structured
      vaccineCode: d.vaccineCode ?? null,
      doseNumber: d.doseNumber ?? null,
      mode: d.mode ?? ("routine" as const),
      campaignId: d.campaignId ?? null,
      hpvSessionId: d.hpvSessionId ?? null,
      batchNumber: d.batchNumber ?? null,
      diluentBatchNumber: d.diluentBatchNumber ?? null,
      lotNumber: d.lotNumber ?? null,
      expiryDate: d.expiryDate ?? null,
      site: d.site ?? null,
      route: d.route ?? null,
      administeredBy: d.administeredBy ?? params.createdBy,
      administeredAt: d.administeredAt ?? new Date(),
      nextDoseDueDate: d.nextDoseDueDate ?? null,
      sourceFacilityName: d.sourceFacilityName ?? null,
    }));

    return tx.insert(immunization_histories).values(rows).returning();
  }

  /**
   * Returns the set of (vaccine_code, dose_number) pairs already on file for
   * this patient. Used by the service to reject duplicate batch entries.
   */
  public async listExistingDoseKeys(patientId: string) {
    const rows = await db
      .select({
        vaccineCode: immunization_histories.vaccineCode,
        doseNumber: immunization_histories.doseNumber,
      })
      .from(immunization_histories)
      .where(
        and(
          eq(immunization_histories.patientId, patientId),
          isNull(immunization_histories.deletedAt),
        ),
      );
    return rows;
  }

  // ---------------------------------------------------------------------------
  // Vaccine catalog
  // ---------------------------------------------------------------------------

  public async listVaccineCatalog() {
    const vRows = await db
      .select()
      .from(vaccines)
      .orderBy(asc(vaccines.displayOrder));
    const dRows = await db
      .select()
      .from(vaccine_doses)
      .orderBy(asc(vaccine_doses.vaccineCode), asc(vaccine_doses.doseNumber));
    const dosesByVaccine = new Map<string, typeof dRows>();
    for (const d of dRows) {
      const arr = dosesByVaccine.get(d.vaccineCode) ?? [];
      arr.push(d);
      dosesByVaccine.set(d.vaccineCode, arr);
    }
    return vRows.map((v) => ({
      ...v,
      doses: dosesByVaccine.get(v.code) ?? [],
    }));
  }

  /**
   * Validation lookup: returns the catalog dose row for (code, doseNumber)
   * or null if the pair isn't defined. The service uses this to gate inserts.
   */
  public async findCatalogDose(vaccineCode: string, doseNumber: number) {
    const rows = await db
      .select()
      .from(vaccine_doses)
      .where(
        and(
          eq(vaccine_doses.vaccineCode, vaccineCode),
          eq(vaccine_doses.doseNumber, doseNumber),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  public async findVaccine(vaccineCode: string) {
    const rows = await db
      .select()
      .from(vaccines)
      .where(eq(vaccines.code, vaccineCode))
      .limit(1);
    return rows[0] ?? null;
  }

  // ---------------------------------------------------------------------------
  // Patient schedule (catalog × patient doses)
  // ---------------------------------------------------------------------------

  public async listPatientDoses(patientId: string) {
    return db
      .select()
      .from(immunization_histories)
      .where(
        and(
          eq(immunization_histories.patientId, patientId),
          isNull(immunization_histories.deletedAt),
        ),
      )
      .orderBy(
        asc(immunization_histories.vaccineCode),
        asc(immunization_histories.doseNumber),
      );
  }

  // ---------------------------------------------------------------------------
  // AEFI
  // ---------------------------------------------------------------------------

  public async createAefiEvent(data: {
    immunizationHistoryId: string;
    patientId: string;
    childImmunizationId: string;
    parentName?: string | null;
    parentContact?: string | null;
    aefiRegisteredAt: string;
    vaccineCode: string;
    vaccineBatch?: string | null;
    diluentBatch?: string | null;
    vaccinatedAt?: Date | null;
    vaccinationPlace?: string | null;
    symptomOnsetAt?: Date | null;
    symptoms?: string | null;
    severity: "mild" | "severe";
    outcome?:
      | "recovered"
      | "recovering"
      | "referred"
      | "died"
      | "unknown"
      | null;
    management?: string | null;
    referredToFacilityId?: string | null;
    notes?: string | null;
  }) {
    const inserted = await db
      .insert(aefi_events)
      .values({
        ...data,
        facilityId: this.context.facilityId,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0] ?? null;
  }

  public async listAefiEvents(params: {
    from?: Date;
    toExclusive?: Date;
    patientId?: string;
  }) {
    const clauses = [eq(aefi_events.facilityId, this.context.facilityId)];
    if (params.patientId) {
      clauses.push(eq(aefi_events.patientId, params.patientId));
    }
    if (params.from) {
      clauses.push(
        gte(aefi_events.aefiRegisteredAt, params.from.toISOString().slice(0, 10)),
      );
    }
    if (params.toExclusive) {
      clauses.push(
        lt(
          aefi_events.aefiRegisteredAt,
          params.toExclusive.toISOString().slice(0, 10),
        ),
      );
    }
    return db
      .select()
      .from(aefi_events)
      .where(and(...clauses))
      .orderBy(desc(aefi_events.aefiRegisteredAt));
  }

  // ---------------------------------------------------------------------------
  // Campaigns
  // ---------------------------------------------------------------------------

  public async createCampaign(data: {
    vaccineCode: string;
    roundNumber?: number | null;
    campaignKind?: "national" | "outbreak_response" | null;
    startDate: string;
    endDate?: string | null;
    targetAgeMinMonths?: number | null;
    targetAgeMaxMonths?: number | null;
    targetPopulation?: number | null;
    notes?: string | null;
  }) {
    const inserted = await db
      .insert(immunization_campaigns)
      .values({
        ...data,
        facilityId: this.context.facilityId,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0] ?? null;
  }

  public async listCampaigns(params: { vaccineCode?: string; year?: number }) {
    const clauses = [
      eq(immunization_campaigns.facilityId, this.context.facilityId),
    ];
    if (params.vaccineCode) {
      clauses.push(eq(immunization_campaigns.vaccineCode, params.vaccineCode));
    }
    return db
      .select()
      .from(immunization_campaigns)
      .where(and(...clauses))
      .orderBy(desc(immunization_campaigns.startDate));
  }

  // ---------------------------------------------------------------------------
  // HPV school sessions
  // ---------------------------------------------------------------------------

  public async createHpvSession(data: {
    schoolName?: string | null;
    sessionDate: string;
    grade?: string | null;
    notes?: string | null;
  }) {
    const inserted = await db
      .insert(hpv_school_sessions)
      .values({
        ...data,
        facilityId: this.context.facilityId,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0] ?? null;
  }

  public async listHpvSessions(params: { from?: Date; toExclusive?: Date }) {
    const clauses = [
      eq(hpv_school_sessions.facilityId, this.context.facilityId),
    ];
    if (params.from) {
      clauses.push(
        gte(
          hpv_school_sessions.sessionDate,
          params.from.toISOString().slice(0, 10),
        ),
      );
    }
    if (params.toExclusive) {
      clauses.push(
        lt(
          hpv_school_sessions.sessionDate,
          params.toExclusive.toISOString().slice(0, 10),
        ),
      );
    }
    return db
      .select()
      .from(hpv_school_sessions)
      .where(and(...clauses))
      .orderBy(desc(hpv_school_sessions.sessionDate));
  }

  // ---------------------------------------------------------------------------
  // Feeding milestones (HMIS 2.1)
  // ---------------------------------------------------------------------------

  public async upsertFeedingMilestones(
    childImmunizationId: string,
    data: {
      breastfedWithin1h?: boolean | null;
      exclusiveBfMonths?: number | null;
      complementaryFeedingStartAgeMonths?: number | null;
      notes?: string | null;
    },
  ) {
    const existing = await db
      .select({ id: child_feeding_milestones.id })
      .from(child_feeding_milestones)
      .where(eq(child_feeding_milestones.childImmunizationId, childImmunizationId))
      .limit(1);

    if (existing[0]) {
      const updated = await db
        .update(child_feeding_milestones)
        .set({
          ...data,
          updatedAt: new Date(),
          updatedBy: this.context.userId,
        })
        .where(eq(child_feeding_milestones.id, existing[0].id))
        .returning();
      return updated[0] ?? null;
    }

    const inserted = await db
      .insert(child_feeding_milestones)
      .values({
        childImmunizationId,
        ...data,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0] ?? null;
  }

  public async findFeedingMilestones(childImmunizationId: string) {
    const rows = await db
      .select()
      .from(child_feeding_milestones)
      .where(
        eq(child_feeding_milestones.childImmunizationId, childImmunizationId),
      )
      .limit(1);
    return rows[0] ?? null;
  }
}
