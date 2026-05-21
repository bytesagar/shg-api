import { db } from "../../db";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import {
  child_immunizations,
  encounters,
  immunization_histories,
  visits,
} from "../../db/schema";
import { FacilityContext } from "../../context/facility-context";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import {
  ImmunizationDoseInsert,
  ImmunizationRepository,
} from "./immunization.repository";
import { PatientRepository } from "../patients/patient.repository";
import type {
  AefiCreateInput,
  CampaignCreateInput,
  ChildImmunizationUpsertInput,
  FeedingMilestonesUpsertInput,
  HpvSessionCreateInput,
  ImmunizationDoseEntryInput,
  ImmunizationDosesCreateInput,
  ImmunizationHistoryCreateInput,
} from "./immunizations.validation";

/** Result of the batch dose endpoint. */
export interface BatchDoseResult {
  items: Array<typeof import("../../db/schema").immunization_histories.$inferSelect>;
}

/** Domain errors specific to the batch dose pathway. */
export type BatchDoseError =
  | { kind: "PATIENT_NOT_FOUND" }
  | { kind: "PROFILE_REQUIRED" } // child_immunizations row missing
  | {
      kind: "UNKNOWN_VACCINE";
      conflictingIndex: number;
      vaccineCode: string;
    }
  | {
      kind: "DOSE_NUMBER_OUT_OF_RANGE";
      conflictingIndex: number;
      vaccineCode: string;
      doseNumber: number;
      totalDoses: number;
    }
  | {
      kind: "DUPLICATE_IN_BATCH";
      conflictingIndex: number;
      vaccineCode: string;
      doseNumber: number;
    }
  | {
      kind: "DUPLICATE_EXISTS";
      conflictingIndex: number;
      vaccineCode: string;
      doseNumber: number;
    };

export class ImmunizationService {
  private readonly repo: ImmunizationRepository;
  private readonly patientRepository: PatientRepository;

  constructor(private readonly context: FacilityContext) {
    this.repo = new ImmunizationRepository(context);
    this.patientRepository = new PatientRepository(context);
  }

  // ---------------------------------------------------------------------------
  // Child immunization profile
  // ---------------------------------------------------------------------------

  public async upsertChildImmunizationProfile(
    patientId: string,
    input: ChildImmunizationUpsertInput,
  ) {
    return this.repo.upsertChildImmunizationProfile({
      patientId,
      ...input,
    });
  }

  // ---------------------------------------------------------------------------
  // Legacy single-dose path (kept for back-compat with existing clients).
  // New clients should use `recordDoses`.
  // ---------------------------------------------------------------------------

  public async createImmunizationHistory(
    patientId: string,
    input: ImmunizationHistoryCreateInput,
  ) {
    const patient = await this.patientRepository.findById(patientId);
    if (!patient) {
      throw new AppError("Patient not found", HTTP_STATUS.NOT_FOUND);
    }

    const dateAt = new Date(`${input.date}T00:00:00.000Z`);
    const vaccinatedDateAt =
      input.vaccinatedDate != null
        ? new Date(`${input.vaccinatedDate}T00:00:00.000Z`)
        : input.vaccinated
          ? dateAt
          : null;

    return db.transaction(async (tx) => {
      const visit = await this.findOrCreateImmunizationVisit(
        tx,
        patient.id,
        input.date,
      );
      const encounter = await this.createImmunizationEncounter(
        tx,
        patient.id,
        visit.id,
        visit.service ?? "immunization",
      );

      const created = await this.repo.createImmunizationHistoryForPatient(tx, {
        patientId: patient.id,
        visitId: visit.id,
        encounterId: encounter.id,
        vaccineName: input.vaccineName,
        date: dateAt,
        vaccinated: input.vaccinated ? 1 : 0,
        vaccinatedDate: vaccinatedDateAt,
        aefi: input.aefi ?? null,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      });

      if (!created) {
        throw new AppError(
          "Child immunization profile not found. Create it first.",
          HTTP_STATUS.BAD_REQUEST,
        );
      }

      return created;
    });
  }

  // ---------------------------------------------------------------------------
  // Batch dose recording — HMIS 2082
  // ---------------------------------------------------------------------------

  /**
   * Records one or more doses in a single transaction.
   *
   * The controller normalises the request body to a `{ doses: [...] }` shape
   * before invoking this method, so callers always pass an array — even when
   * the wire payload was a single flat dose.
   *
   * Returns `{ ok: true, items }` on success or `{ ok: false, error }` with
   * the offending index so the controller can return a useful 4xx.
   */
  public async recordDoses(
    patientId: string,
    doses: ImmunizationDoseEntryInput[],
  ): Promise<
    | { ok: true; items: BatchDoseResult["items"] }
    | { ok: false; error: BatchDoseError }
  > {
    const patient = await this.patientRepository.findById(patientId);
    if (!patient) {
      return { ok: false, error: { kind: "PATIENT_NOT_FOUND" } };
    }

    const profile = await this.repo.findChildImmunizationByPatient(patient.id);
    if (!profile) {
      return { ok: false, error: { kind: "PROFILE_REQUIRED" } };
    }

    // 1. Validate each entry against the catalog.
    const catalogChecks = await Promise.all(
      doses.map(async (d) => {
        if (!d.vaccineCode || !d.doseNumber) return { ok: true as const };
        const v = await this.repo.findVaccine(d.vaccineCode);
        if (!v) return { ok: false as const, kind: "unknown_vaccine" as const };
        if (d.doseNumber > v.totalDoses) {
          return {
            ok: false as const,
            kind: "out_of_range" as const,
            totalDoses: v.totalDoses,
          };
        }
        return { ok: true as const, vaccine: v };
      }),
    );
    for (let i = 0; i < catalogChecks.length; i++) {
      const check = catalogChecks[i];
      const d = doses[i];
      if (!check.ok && check.kind === "unknown_vaccine") {
        return {
          ok: false,
          error: {
            kind: "UNKNOWN_VACCINE",
            conflictingIndex: i,
            vaccineCode: d.vaccineCode!,
          },
        };
      }
      if (!check.ok && check.kind === "out_of_range") {
        return {
          ok: false,
          error: {
            kind: "DOSE_NUMBER_OUT_OF_RANGE",
            conflictingIndex: i,
            vaccineCode: d.vaccineCode!,
            doseNumber: d.doseNumber!,
            totalDoses: check.totalDoses,
          },
        };
      }
    }

    // 2. Dedupe within the batch.
    const seen = new Set<string>();
    for (let i = 0; i < doses.length; i++) {
      const d = doses[i];
      if (!d.vaccineCode || !d.doseNumber) continue;
      const key = `${d.vaccineCode}:${d.doseNumber}`;
      if (seen.has(key)) {
        return {
          ok: false,
          error: {
            kind: "DUPLICATE_IN_BATCH",
            conflictingIndex: i,
            vaccineCode: d.vaccineCode,
            doseNumber: d.doseNumber,
          },
        };
      }
      seen.add(key);
    }

    // 3. Dedupe against existing rows.
    const existingKeys = await this.repo.listExistingDoseKeys(patient.id);
    const existingSet = new Set(
      existingKeys
        .filter((r) => r.vaccineCode && r.doseNumber != null)
        .map((r) => `${r.vaccineCode}:${r.doseNumber}`),
    );
    for (let i = 0; i < doses.length; i++) {
      const d = doses[i];
      if (!d.vaccineCode || !d.doseNumber) continue;
      if (existingSet.has(`${d.vaccineCode}:${d.doseNumber}`)) {
        return {
          ok: false,
          error: {
            kind: "DUPLICATE_EXISTS",
            conflictingIndex: i,
            vaccineCode: d.vaccineCode,
            doseNumber: d.doseNumber,
          },
        };
      }
    }

    // 4. Compute next-dose due dates from the catalog when missing.
    const enrichedDoses: ImmunizationDoseInsert[] = await Promise.all(
      doses.map(async (d) => {
        const administeredAt = d.administeredAt
          ? new Date(d.administeredAt)
          : new Date();
        let nextDoseDueDate: string | null = null;
        if (d.vaccineCode && d.doseNumber) {
          const nextDose = await this.repo.findCatalogDose(
            d.vaccineCode,
            d.doseNumber + 1,
          );
          if (nextDose?.targetAgeMinDays != null) {
            // Best-effort: schedule next from administered + gap to next window.
            const currentDose = await this.repo.findCatalogDose(
              d.vaccineCode,
              d.doseNumber,
            );
            const gapDays =
              currentDose?.targetAgeMinDays != null
                ? Math.max(
                    nextDose.targetAgeMinDays - currentDose.targetAgeMinDays,
                    14,
                  )
                : 28;
            const due = new Date(
              administeredAt.getTime() + gapDays * 24 * 60 * 60 * 1000,
            );
            nextDoseDueDate = due.toISOString().slice(0, 10);
          }
        }
        return {
          vaccineCode: d.vaccineCode ?? null,
          doseNumber: d.doseNumber ?? null,
          vaccineName: d.vaccineName ?? d.vaccineCode ?? null,
          mode: d.mode ?? "routine",
          campaignId: d.campaignId ?? null,
          hpvSessionId: d.hpvSessionId ?? null,
          batchNumber: d.batchNumber ?? null,
          diluentBatchNumber: d.diluentBatchNumber ?? null,
          lotNumber: d.lotNumber ?? null,
          expiryDate: d.expiryDate ?? null,
          site: d.site ?? null,
          route: d.route ?? null,
          administeredBy: d.administeredBy ?? this.context.userId,
          administeredAt,
          nextDoseDueDate,
          sourceFacilityName: d.sourceFacilityName ?? null,
          vaccinated: d.vaccinated === false ? 0 : 1,
          vaccinatedDate: d.vaccinatedDate
            ? new Date(`${d.vaccinatedDate}T00:00:00.000Z`)
            : administeredAt,
          date: d.date
            ? new Date(`${d.date}T00:00:00.000Z`)
            : administeredAt,
          aefi: d.aefi ?? null,
        };
      }),
    );

    // 5. Insert in a single transaction (one visit + one encounter for all doses).
    const items = await db.transaction(async (tx) => {
      const visitDateIso =
        enrichedDoses[0]?.administeredAt?.toISOString().slice(0, 10) ??
        new Date().toISOString().slice(0, 10);
      const visit = await this.findOrCreateImmunizationVisit(
        tx,
        patient.id,
        visitDateIso,
      );
      const encounter = await this.createImmunizationEncounter(
        tx,
        patient.id,
        visit.id,
        visit.service ?? "immunization",
      );
      return this.repo.createImmunizationHistoryBatch(tx, {
        patientId: patient.id,
        visitId: visit.id,
        encounterId: encounter.id,
        childImmunizationId: profile.id,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
        doses: enrichedDoses,
      });
    });

    return { ok: true, items };
  }

  /** Normalises the union payload into a `doses[]` array. */
  public normaliseDosesPayload(
    input: ImmunizationDosesCreateInput,
  ): ImmunizationDoseEntryInput[] {
    if ("doses" in input && Array.isArray(input.doses)) {
      return input.doses;
    }
    return [input as ImmunizationDoseEntryInput];
  }

  // ---------------------------------------------------------------------------
  // Catalog + patient schedule
  // ---------------------------------------------------------------------------

  public async listVaccineCatalog() {
    return this.repo.listVaccineCatalog();
  }

  public async getPatientSchedule(patientId: string) {
    const [catalog, doses] = await Promise.all([
      this.repo.listVaccineCatalog(),
      this.repo.listPatientDoses(patientId),
    ]);

    const dosesByKey = new Map<string, (typeof doses)[number]>();
    for (const d of doses) {
      if (d.vaccineCode && d.doseNumber != null) {
        dosesByKey.set(`${d.vaccineCode}:${d.doseNumber}`, d);
      }
    }

    return catalog.map((v) => ({
      vaccine: {
        code: v.code,
        label: v.label,
        category: v.category,
        totalDoses: v.totalDoses,
        defaultRoute: v.defaultRoute,
        defaultSite: v.defaultSite,
        isHpv: v.isHpv,
        displayOrder: v.displayOrder,
      },
      doses: v.doses.map((catalogDose) => ({
        catalog: catalogDose,
        administered:
          dosesByKey.get(`${v.code}:${catalogDose.doseNumber}`) ?? null,
      })),
    }));
  }

  // ---------------------------------------------------------------------------
  // AEFI
  // ---------------------------------------------------------------------------

  public async recordAefi(input: AefiCreateInput) {
    // Resolve patient + profile + vaccineCode from the linked dose row so
    // the AEFI can never be mis-linked to a patient who didn't receive it.
    const [row] = await db
      .select({
        patientId: immunization_histories.patientId,
        childImmunizationId: immunization_histories.childImmunizationId,
        vaccineCode: immunization_histories.vaccineCode,
        vaccineName: immunization_histories.vaccineName,
        administeredAt: immunization_histories.administeredAt,
        batchNumber: immunization_histories.batchNumber,
        diluentBatchNumber: immunization_histories.diluentBatchNumber,
        facilityId: immunization_histories.facilityId,
      })
      .from(immunization_histories)
      .where(eq(immunization_histories.id, input.immunizationHistoryId))
      .limit(1);

    if (!row) {
      throw new AppError(
        "Immunization history not found",
        HTTP_STATUS.NOT_FOUND,
      );
    }
    if (row.facilityId && row.facilityId !== this.context.facilityId) {
      // Facility scoping: a dose from another facility's tenant should be
      // invisible to this user.
      throw new AppError(
        "Immunization history not found",
        HTTP_STATUS.NOT_FOUND,
      );
    }
    void child_immunizations; // imported for future cross-checks; intentional

    return this.repo.createAefiEvent({
      immunizationHistoryId: input.immunizationHistoryId,
      patientId: row.patientId,
      childImmunizationId: row.childImmunizationId,
      parentName: input.parentName ?? null,
      parentContact: input.parentContact ?? null,
      aefiRegisteredAt: input.aefiRegisteredAt,
      vaccineCode: row.vaccineCode ?? row.vaccineName ?? "UNKNOWN",
      vaccineBatch: input.vaccineBatch ?? row.batchNumber ?? null,
      diluentBatch: input.diluentBatch ?? row.diluentBatchNumber ?? null,
      vaccinatedAt: input.vaccinatedAt
        ? new Date(input.vaccinatedAt)
        : row.administeredAt,
      vaccinationPlace: input.vaccinationPlace ?? null,
      symptomOnsetAt: input.symptomOnsetAt
        ? new Date(input.symptomOnsetAt)
        : null,
      symptoms: input.symptoms ?? null,
      severity: input.severity,
      outcome: input.outcome ?? null,
      management: input.management ?? null,
      referredToFacilityId: input.referredToFacilityId ?? null,
      notes: input.notes ?? null,
    });
  }

  public async listAefiEvents(params: {
    from?: Date;
    toExclusive?: Date;
    patientId?: string;
  }) {
    return this.repo.listAefiEvents(params);
  }

  // ---------------------------------------------------------------------------
  // Campaigns / HPV sessions / feeding
  // ---------------------------------------------------------------------------

  public async createCampaign(input: CampaignCreateInput) {
    return this.repo.createCampaign({
      vaccineCode: input.vaccineCode,
      roundNumber: input.roundNumber ?? null,
      campaignKind: input.campaignKind ?? null,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      targetAgeMinMonths: input.targetAgeMinMonths ?? null,
      targetAgeMaxMonths: input.targetAgeMaxMonths ?? null,
      targetPopulation: input.targetPopulation ?? null,
      notes: input.notes ?? null,
    });
  }

  public async listCampaigns(params: { vaccineCode?: string; year?: number }) {
    return this.repo.listCampaigns(params);
  }

  public async createHpvSession(input: HpvSessionCreateInput) {
    return this.repo.createHpvSession({
      schoolName: input.schoolName ?? null,
      sessionDate: input.sessionDate,
      grade: input.grade ?? null,
      notes: input.notes ?? null,
    });
  }

  public async listHpvSessions(params: { from?: Date; toExclusive?: Date }) {
    return this.repo.listHpvSessions(params);
  }

  public async upsertFeedingMilestones(
    patientId: string,
    input: FeedingMilestonesUpsertInput,
  ) {
    const profile = await this.repo.findChildImmunizationByPatient(patientId);
    if (!profile) {
      throw new AppError(
        "Child immunization profile not found. Create it first.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    return this.repo.upsertFeedingMilestones(profile.id, input);
  }

  public async getFeedingMilestones(patientId: string) {
    const profile = await this.repo.findChildImmunizationByPatient(patientId);
    if (!profile) return null;
    return this.repo.findFeedingMilestones(profile.id);
  }

  // ---------------------------------------------------------------------------
  // Shared helpers
  // ---------------------------------------------------------------------------

  private async findOrCreateImmunizationVisit(
    tx: Parameters<Parameters<(typeof db)["transaction"]>[0]>[0],
    patientId: string,
    fallbackDate: string,
  ) {
    const activeStatuses = ["planned", "arrived", "in_progress"] as const;
    const activeVisit = await tx
      .select()
      .from(visits)
      .where(
        and(
          eq(visits.patientId, patientId),
          eq(visits.facilityId, this.context.facilityId),
          isNull(visits.deletedAt),
          or(inArray(visits.status, activeStatuses), isNull(visits.status)),
        ),
      )
      .orderBy(desc(visits.date))
      .limit(1);

    const visit =
      activeVisit[0] ??
      (
        await tx
          .insert(visits)
          .values({
            date: fallbackDate,
            reason: "IMMUNIZATION",
            service: "immunization",
            status: "finished",
            patientId,
            facilityId: this.context.facilityId,
            doctorId: this.context.userId,
          })
          .returning()
      )[0];

    if (!visit) {
      throw new AppError(
        "Unable to create visit for immunization",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
      );
    }
    return visit;
  }

  private async createImmunizationEncounter(
    tx: Parameters<Parameters<(typeof db)["transaction"]>[0]>[0],
    patientId: string,
    visitId: string,
    service: string,
  ) {
    const [encounter] = await tx
      .insert(encounters)
      .values({
        visitId,
        patientId,
        facilityId: this.context.facilityId,
        encounterAt: new Date(),
        reason: "IMMUNIZATION",
        service,
        status: "finished",
        encounterType: "IMMUNIZATION",
        doctorId: this.context.userId,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();

    if (!encounter) {
      throw new AppError(
        "Unable to create encounter for immunization",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
      );
    }
    return encounter;
  }
}
