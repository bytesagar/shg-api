import { db } from "../../db";
import {
  antenatal_cares,
  encounters,
  deliveries,
  delivery_children,
  pregnancies,
  postnatal_cares,
  pregnancy_complications,
  previous_pregnancies,
  maternal_deaths,
  newborn_deaths,
  safe_abortions,
  safe_abortion_complications,
  post_abortion_cares,
  facility_population_targets,
} from "../../db/schema";
import { FacilityContext } from "../../context/facility-context";
import { FacilityRepository } from "../../core/facility-repository";
import { and, count, desc, eq } from "drizzle-orm";

export class MaternalHealthRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, pregnancies.facilityId);
  }

  public async createEncounter(
    tx: any,
    data: {
      visitId: string;
      patientId: string;
      encounterType: string;
      reason: string;
      service?: string | null;
      doctorId?: string | null;
    },
  ) {
    const inserted = await tx
      .insert(encounters)
      .values({
        visitId: data.visitId,
        patientId: data.patientId,
        facilityId: this.context.facilityId,
        encounterAt: new Date(),
        reason: data.reason,
        service: data.service ?? null,
        status: "finished",
        encounterType: data.encounterType,
        doctorId: data.doctorId ?? null,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0] ?? null;
  }

  public async findActivePregnancyByPatientId(tx: any, patientId: string) {
    const result = await tx
      .select({ id: pregnancies.id })
      .from(pregnancies)
      .where(
        this.withFacilityScope(
          and(
            eq(pregnancies.patientId, patientId),
            eq(pregnancies.status, "active"),
          ),
        ),
      )
      .limit(1);
    return result[0] ?? null;
  }

  public async endPregnancy(tx: any, pregnancyId: string) {
    const updated = await tx
      .update(pregnancies)
      .set({
        status: "ended",
        endedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: this.context.userId,
      })
      .where(this.withFacilityScope(eq(pregnancies.id, pregnancyId)))
      .returning({
        id: pregnancies.id,
        status: pregnancies.status,
        endedAt: pregnancies.endedAt,
      });
    return updated[0] ?? null;
  }

  public async createPregnancy(
    tx: any,
    data: {
      patientId: string;
      firstVisit: string;
      gravida: string;
      para?: string | null;
      lastMenstruationPeriod?: string | null;
      expectedDeliveryDate?: string | null;
      assignedFchvId?: string | null;
      visitId: string;
      encounterId: string;
      createdBy: string;
      updatedBy: string;

      // HMIS 2082 extensions (all optional)
      hmisEthnicCode?:
        | "01_dalit"
        | "02_janajati"
        | "03_madhesi"
        | "04_muslim"
        | "05_brahmin_chhetri"
        | "06_other"
        | null;
      gravidaNum?: number | null;
      paraNum?: number | null;
      abortionsNum?: number | null;
      livingChildrenNum?: number | null;
    },
  ) {
    const inserted = await tx
      .insert(pregnancies)
      .values({
        ...data,
        status: "active",
        endedAt: null,
        facilityId: this.context.facilityId,
      })
      .returning();
    return inserted[0] ?? null;
  }

  public async getPregnancyForCompute(pregnancyId: string) {
    const rows = await db
      .select({
        id: pregnancies.id,
        patientId: pregnancies.patientId,
        lastMenstruationPeriod: pregnancies.lastMenstruationPeriod,
        td1Date: pregnancies.td1Date,
        td2Date: pregnancies.td2Date,
        td2plusDate: pregnancies.td2plusDate,
      })
      .from(pregnancies)
      .where(this.withFacilityScope(eq(pregnancies.id, pregnancyId)))
      .limit(1);
    return rows[0] ?? null;
  }

  public async updatePregnancyScreening(
    pregnancyId: string,
    patch: Record<string, unknown>,
  ) {
    const result = await db
      .update(pregnancies)
      .set({ ...patch, updatedAt: new Date(), updatedBy: this.context.userId })
      .where(this.withFacilityScope(eq(pregnancies.id, pregnancyId)))
      .returning();
    return result[0] ?? null;
  }

  public async setPregnancyComplianceFlag(
    pregnancyId: string,
    hmisCompliant: boolean,
  ) {
    await db
      .update(pregnancies)
      .set({
        hmisCompliant,
        updatedAt: new Date(),
        updatedBy: this.context.userId,
      })
      .where(this.withFacilityScope(eq(pregnancies.id, pregnancyId)));
  }

  public async findPregnancyById(id: string) {
    const rows = await db
      .select({
        pregnancy: pregnancies,
        delivery: deliveries,
        postnatalCare: postnatal_cares,
      })
      .from(pregnancies)
      .leftJoin(deliveries, eq(deliveries.pregnancyId, pregnancies.id))
      .leftJoin(
        postnatal_cares,
        eq(postnatal_cares.pregnancyId, pregnancies.id),
      )
      .where(this.withFacilityScope(eq(pregnancies.id, id)));
    const pregnancy = rows[0]?.pregnancy;
    if (!pregnancy) return null;

    const deliveriesById = new Map<string, typeof deliveries.$inferSelect>();
    const postnatalCaresById = new Map<
      string,
      typeof postnatal_cares.$inferSelect
    >();

    for (const row of rows) {
      if (row.delivery?.id) {
        deliveriesById.set(row.delivery.id, row.delivery);
      }
      if (row.postnatalCare?.id) {
        postnatalCaresById.set(row.postnatalCare.id, row.postnatalCare);
      }
    }

    return {
      ...pregnancy,
      deliveries: Array.from(deliveriesById.values()),
      postnatalCares: Array.from(postnatalCaresById.values()),
    };
  }

  public async countPregnancies(params: { patientId?: string }) {
    const filters = [];
    if (params.patientId)
      filters.push(eq(pregnancies.patientId, params.patientId));

    const where =
      filters.length > 0
        ? this.withFacilityScope(and(...filters))
        : this.withFacilityScope();

    const result = await db
      .select({ count: count() })
      .from(pregnancies)
      .where(where);
    return Number(result[0]?.count ?? 0);
  }

  public async listPregnancies(params: {
    patientId?: string;
    page: number;
    pageSize: number;
  }) {
    const offset = (params.page - 1) * params.pageSize;

    const filters = [];
    if (params.patientId)
      filters.push(eq(pregnancies.patientId, params.patientId));
    const where =
      filters.length > 0
        ? this.withFacilityScope(and(...filters))
        : this.withFacilityScope();

    const items = await db
      .select()
      .from(pregnancies)
      .where(where)
      .orderBy(desc(pregnancies.firstVisit))
      .limit(params.pageSize)
      .offset(offset);

    return items;
  }

  public async createAntenatalCare(
    tx: any,
    data: {
      patientId: string;
      pregnancyId: string;
      ancVisitDate?: string | null;
      visitingTimeWeek?: string | null;
      visitingTimeMonth?: string | null;
      motherWeight?: number | null;
      anemia?: number | null;
      edema?: number | null;
      systolic?: number | null;
      diastolic?: number | null;
      pregnancyPeriodWeek?: string | null;
      fundalHeight?: number | null;
      babyPresentation?: string | null;
      heartRate?: number | null;
      otherProblems?: string | null;
      treatment?: string | null;
      medicalAdvice?: string | null;
      nextVisitSchedule?: string | null;
      ironTablet?: number | null;
      albendazole?: number | null;
      tdVaccination?: string | null;
      obstructiveComplications?: string | null;
      obstructiveComplicationsOther?: string | null;
      dangerSign?: string | null;
      dangerSignOther?: string | null;
      documentUrl?: string | null;
      doctorFeedback?: string | null;
      refer?: string | null;
      referReason?: string | null;
      calcium?: number | null;
      folicAcid?: number | null;
      investigation?: string | null;
      serviceProvidedBy?: string | null;
      visitId: string;
      encounterId: string;
      createdBy: string;
      updatedBy: string;

      // HMIS 2082 extensions
      protocolVisitNumber?:
        | "ANC1"
        | "ANC2"
        | "ANC3"
        | "ANC4"
        | "ANC5"
        | "ANC6"
        | "ANC7"
        | "ANC8"
        | null;
      protocolWindowViolation?: boolean;
      gestationalAgeWeeks?: number | null;
      anaemiaPresent?: boolean | null;
      edemaLocation?: string | null;
      motherHeightCm?: number | null;
      bmi?: number | null;
    },
  ) {
    const inserted = await tx.insert(antenatal_cares).values(data).returning();
    return inserted[0] ?? null;
  }

  public async countAntenatalCares(params: {
    patientId?: string;
    pregnancyId?: string;
  }) {
    const filters = [];
    if (params.patientId)
      filters.push(eq(antenatal_cares.patientId, params.patientId));
    if (params.pregnancyId)
      filters.push(eq(antenatal_cares.pregnancyId, params.pregnancyId));

    const where =
      filters.length > 0
        ? this.withFacilityScope(and(...filters))
        : this.withFacilityScope();

    const result = await db
      .select({ count: count() })
      .from(antenatal_cares)
      .innerJoin(pregnancies, eq(antenatal_cares.pregnancyId, pregnancies.id))
      .where(where);
    return Number(result[0]?.count ?? 0);
  }

  public async listAntenatalCares(params: {
    patientId?: string;
    pregnancyId?: string;
    page: number;
    pageSize: number;
  }) {
    const offset = (params.page - 1) * params.pageSize;

    const filters = [];
    if (params.patientId)
      filters.push(eq(antenatal_cares.patientId, params.patientId));
    if (params.pregnancyId)
      filters.push(eq(antenatal_cares.pregnancyId, params.pregnancyId));

    const where =
      filters.length > 0
        ? this.withFacilityScope(and(...filters))
        : this.withFacilityScope();

    const items = await db
      .select()
      .from(antenatal_cares)
      .innerJoin(pregnancies, eq(antenatal_cares.pregnancyId, pregnancies.id))
      .where(where)
      .orderBy(desc(antenatal_cares.createdAt))
      .limit(params.pageSize)
      .offset(offset);

    return items.map((r) => r.antenatal_cares);
  }

  public async createDelivery(
    tx: any,
    data: {
      patientId: string;
      pregnancyId: string;
      deliveryDate?: string | null;
      placeOfDelivery?: string | null;
      otherPlaceOfDelivery?: string | null;
      babyPresentation?: string | null;
      typeOfDelivery?: string | null;
      noOfLiveMaleBaby?: number | null;
      noOfLiveFemaleBaby?: number | null;
      noOfStillMaleBaby?: number | null;
      noOfStillFemaleBaby?: number | null;
      noOfFreshStillBirth?: number | null;
      noOfMaceratedStillBirth?: number | null;
      deliveryAttendedBy?: string | null;
      otherProblems?: string | null;
      treatment?: string | null;
      investigation?: string | null;
      doctorFeedback?: string | null;
      refer?: string | null;
      referReason?: string | null;
      vitaminK?: number | null;
      umbilicalCream?: number | null;
      visitId: string;
      encounterId: string;
      createdBy: string;
      updatedBy: string;

      // HMIS 2082 extensions
      admissionAt?: Date | string | null;
      deliveryAt?: Date | string | null;
      dischargeAt?: Date | string | null;
      laborType?: "spontaneous" | "augmented" | "induced" | null;
      fetalPresentation?: "cephalic" | "breech" | "shoulder" | null;
      deliveryMode?: "spontaneous" | "vacuum" | "forceps" | "cs" | null;
      placeCode?: "home" | "this_facility" | "other_facility" | "enroute" | null;
      otherFacilityName?: string | null;
      birthAttendant?: "sba_anm" | "shp" | "other" | null;
      noOfLiveTermBabies?: number | null;
      noOfLivePretermBabies?: number | null;
      noOfStillIntrapartum?: number | null;
      noOfStillAntepartum?: number | null;
      oxytocinGiven?: boolean | null;
      kmcGiven?: boolean | null;
      earlyBreastfeedingWithin1h?: boolean | null;
      antiDGiven?: boolean | null;
      warmBagDistributed?: boolean | null;
      warmBagReasonIfNot?: string | null;
      bloodTransfusionPints?: number | null;
      cabinUsed?: boolean | null;
      maternalOutcome?:
        | "recovered"
        | "stable"
        | "referred"
        | "lama"
        | "absconded"
        | "died"
        | null;
      referredToFacilityId?: string | null;
      transportIncentiveEligible?: boolean | null;
      transportIncentiveReceived?: boolean | null;
      transportIncentiveAmount?: number | null;
      transportIncentiveReasonIfNot?: string | null;
    },
  ) {
    const inserted = await tx.insert(deliveries).values(data).returning();
    return inserted[0] ?? null;
  }

  public async createDeliveryChildren(
    tx: any,
    deliveryId: string,
    pregnancyId: string,
    patientId: string,
    children: Array<{
      weightOfBaby?: number | null;
      newBornBabyStatus?: string | null;
      apgarScore1?: number | null;
      apgarScore2?: number | null;
      sex?: "male" | "female" | "other" | null;
      neonatalStatus?:
        | "normal"
        | "infection"
        | "asphyxia"
        | "hypothermia"
        | "jaundice"
        | "congenital_syphilis"
        | null;
      isTerm?: boolean | null;
      congenitalAnomalyMajor?: boolean | null;
      congenitalAnomalyMinor?: boolean | null;
      congenitalAnomalyOtherCount?: number | null;
      congenitalAnomalyIcdCode?: string | null;
    }>,
  ) {
    if (children.length === 0) return [];
    const rows = children.map((c) => ({
      deliveryId,
      pregnancyId,
      patientId,
      weightOfBaby: c.weightOfBaby ?? null,
      newBornBabyStatus: c.newBornBabyStatus ?? null,
      apgarScore1: c.apgarScore1 ?? null,
      apgarScore2: c.apgarScore2 ?? null,
      sex: c.sex ?? null,
      neonatalStatus: c.neonatalStatus ?? null,
      isTerm: c.isTerm ?? null,
      congenitalAnomalyMajor: c.congenitalAnomalyMajor ?? null,
      congenitalAnomalyMinor: c.congenitalAnomalyMinor ?? null,
      congenitalAnomalyOtherCount: c.congenitalAnomalyOtherCount ?? null,
      congenitalAnomalyIcdCode: c.congenitalAnomalyIcdCode ?? null,
      createdBy: this.context.userId,
      updatedBy: this.context.userId,
    }));
    return tx.insert(delivery_children).values(rows).returning();
  }

  public async countDeliveries(params: {
    patientId?: string;
    pregnancyId?: string;
  }) {
    const filters = [];
    if (params.patientId)
      filters.push(eq(deliveries.patientId, params.patientId));
    if (params.pregnancyId)
      filters.push(eq(deliveries.pregnancyId, params.pregnancyId));

    const where =
      filters.length > 0
        ? this.withFacilityScope(and(...filters))
        : this.withFacilityScope();

    const result = await db
      .select({ count: count() })
      .from(deliveries)
      .innerJoin(pregnancies, eq(deliveries.pregnancyId, pregnancies.id))
      .where(where);
    return Number(result[0]?.count ?? 0);
  }

  public async listDeliveries(params: {
    patientId?: string;
    pregnancyId?: string;
    page: number;
    pageSize: number;
  }) {
    const offset = (params.page - 1) * params.pageSize;

    const filters = [];
    if (params.patientId)
      filters.push(eq(deliveries.patientId, params.patientId));
    if (params.pregnancyId)
      filters.push(eq(deliveries.pregnancyId, params.pregnancyId));

    const where =
      filters.length > 0
        ? this.withFacilityScope(and(...filters))
        : this.withFacilityScope();

    const items = await db
      .select()
      .from(deliveries)
      .innerJoin(pregnancies, eq(deliveries.pregnancyId, pregnancies.id))
      .where(where)
      .orderBy(desc(deliveries.createdAt))
      .limit(params.pageSize)
      .offset(offset);

    return items.map((r) => r.deliveries);
  }

  public async createPostnatalCare(
    tx: any,
    data: {
      patientId: string;
      pregnancyId: string;
      visitingTime: string;
      visitTime: string;
      visitDate: string;
      conditionOfMother: string;
      conditionOfBaby: string;
      medicalAdvice: string;
      familyPlanningServices: string;
      complications: string;
      dangerSignsOnMother: string;
      dangerSignsOnBaby: string;
      checkupAttendedBy: string;
      newBornBabyStatus: string;
      refer?: string | null;
      referReason?: string | null;
      otherProblems?: string | null;
      treatment: string;
      investigation?: string | null;
      doctorFeedback?: string | null;
      ironTablet?: number | null;
      calcium?: number | null;
      serviceProvidedBy?: string | null;
      visitId: string;
      encounterId: string;
      createdBy: string;
      updatedBy: string;

      // HMIS 2082 extensions
      protocolVisitNumber?: "PNC1" | "PNC2" | "PNC3" | "PNC4" | null;
      locationCode?: "facility" | "home" | null;
      familyPlanningServiceType?:
        | "iucd"
        | "implant"
        | "btl"
        | "depo"
        | "none"
        | null;
      fpGivenWithin48h?: boolean | null;
      fpGivenWithin42d?: boolean | null;
      vitaminKDate?: string | null;
      postnatalBloodTransfusionPints?: number | null;
    },
  ) {
    const inserted = await tx.insert(postnatal_cares).values(data).returning();
    return inserted[0] ?? null;
  }

  // ---- HMIS 2082 — Complications, history, deaths, abortion, Aama ----

  public async createComplication(data: {
    pregnancyId: string;
    stage: "anc" | "delivery" | "pnc" | "abortion";
    icd11Code?: string | null;
    icd11Title?: string | null;
    management?: "treated" | "referred" | null;
    referredToFacilityId?: string | null;
    notes?: string | null;
    recordedAtAncId?: string | null;
    recordedAtDeliveryId?: string | null;
    recordedAtPncId?: string | null;
  }) {
    const inserted = await db
      .insert(pregnancy_complications)
      .values({
        ...data,
        facilityId: this.context.facilityId!,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0] ?? null;
  }

  public async createPreviousPregnancies(
    pregnancyId: string,
    items: Array<{
      ordinal: number;
      year?: number | null;
      outcome?: string | null;
      deliveryMode?: "spontaneous" | "vacuum" | "forceps" | "cs" | null;
      complicationIcd11Code?: string | null;
      liveBirth?: boolean | null;
      stillBirth?: boolean | null;
      preterm?: boolean | null;
      twin?: boolean | null;
      abortion?: boolean | null;
      tdDoseReceived?: boolean | null;
      childSex?: "male" | "female" | "other" | null;
      childCurrentAgeMonths?: number | null;
      notes?: string | null;
    }>,
  ) {
    if (items.length === 0) return [];
    const rows = items.map((i) => ({
      pregnancyId,
      ordinal: i.ordinal,
      year: i.year ?? null,
      outcome: i.outcome ?? null,
      deliveryMode: i.deliveryMode ?? null,
      complicationIcd11Code: i.complicationIcd11Code ?? null,
      liveBirth: i.liveBirth ?? null,
      stillBirth: i.stillBirth ?? null,
      preterm: i.preterm ?? null,
      twin: i.twin ?? null,
      abortion: i.abortion ?? null,
      tdDoseReceived: i.tdDoseReceived ?? null,
      childSex: i.childSex ?? null,
      childCurrentAgeMonths: i.childCurrentAgeMonths ?? null,
      notes: i.notes ?? null,
      facilityId: this.context.facilityId!,
      createdBy: this.context.userId,
      updatedBy: this.context.userId,
    }));
    return db.insert(previous_pregnancies).values(rows).returning();
  }

  public async createMaternalDeath(data: {
    patientId: string;
    pregnancyId?: string | null;
    deathDate: string;
    place?: string | null;
    placeDetail?: string | null;
    stage: "pregnant" | "delivery" | "postnatal_42d";
    causeIcd11Code?: string | null;
    causeText?: string | null;
  }) {
    const inserted = await db
      .insert(maternal_deaths)
      .values({
        ...data,
        facilityId: this.context.facilityId!,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0] ?? null;
  }

  public async createNewbornDeath(data: {
    patientId: string;
    deliveryId?: string | null;
    deliveryChildId?: string | null;
    deathDate: string;
    ageAtDeathHours?: number | null;
    causeIcd11Code?: string | null;
    causeText?: string | null;
  }) {
    const inserted = await db
      .insert(newborn_deaths)
      .values({
        ...data,
        facilityId: this.context.facilityId!,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0] ?? null;
  }

  public async createSafeAbortion(data: {
    patientId: string;
    procedureDate: string;
    hmisEthnicCode?:
      | "01_dalit"
      | "02_janajati"
      | "03_madhesi"
      | "04_muslim"
      | "05_brahmin_chhetri"
      | "06_other"
      | null;
    age?: number | null;
    education?: string | null;
    gravidaNum?: number | null;
    livingChildrenNum?: number | null;
    gestationByLmpWeeks?: number | null;
    gestationByExamWeeks?: number | null;
    procedure:
      | "mva"
      | "eva"
      | "medication"
      | "manual_induction"
      | "d_and_e"
      | "misoprostol";
    painManagementGiven?: boolean | null;
    visitId?: string | null;
    encounterId?: string | null;
  }) {
    const inserted = await db
      .insert(safe_abortions)
      .values({
        ...data,
        facilityId: this.context.facilityId!,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0] ?? null;
  }

  public async createSafeAbortionComplication(
    safeAbortionId: string,
    data: {
      icd11Code?: string | null;
      icd11Title?: string | null;
      complicationKind?: string | null;
      management?: "treated" | "referred" | null;
      notes?: string | null;
    },
  ) {
    const inserted = await db
      .insert(safe_abortion_complications)
      .values({
        safeAbortionId,
        ...data,
        facilityId: this.context.facilityId!,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0] ?? null;
  }

  public async createPostAbortionCare(data: {
    safeAbortionId?: string | null;
    patientId: string;
    indication:
      | "incomplete_induced"
      | "incomplete_spontaneous"
      | "septic"
      | "other";
    careDate: string;
    fpServiceProvided?: string | null;
    notes?: string | null;
  }) {
    const inserted = await db
      .insert(post_abortion_cares)
      .values({
        ...data,
        facilityId: this.context.facilityId!,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0] ?? null;
  }

  public async upsertPopulationTarget(data: {
    fiscalYear: number;
    expectedPregnancies: number;
    expectedDeliveries: number;
  }) {
    const existing = await db
      .select({ id: facility_population_targets.id })
      .from(facility_population_targets)
      .where(
        and(
          eq(
            facility_population_targets.facilityId,
            this.context.facilityId!,
          ),
          eq(facility_population_targets.fiscalYear, data.fiscalYear),
        ),
      )
      .limit(1);

    if (existing[0]) {
      const updated = await db
        .update(facility_population_targets)
        .set({
          expectedPregnancies: data.expectedPregnancies,
          expectedDeliveries: data.expectedDeliveries,
          targetSetBy: this.context.userId,
          targetSetAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(facility_population_targets.id, existing[0].id))
        .returning();
      return updated[0] ?? null;
    }

    const inserted = await db
      .insert(facility_population_targets)
      .values({
        facilityId: this.context.facilityId!,
        fiscalYear: data.fiscalYear,
        expectedPregnancies: data.expectedPregnancies,
        expectedDeliveries: data.expectedDeliveries,
        targetSetBy: this.context.userId,
        targetSetAt: new Date(),
      })
      .returning();
    return inserted[0] ?? null;
  }

  public async listPopulationTargets() {
    return db
      .select()
      .from(facility_population_targets)
      .where(
        eq(facility_population_targets.facilityId, this.context.facilityId!),
      )
      .orderBy(desc(facility_population_targets.fiscalYear));
  }

  public async countPostnatalCares(params: {
    patientId?: string;
    pregnancyId?: string;
  }) {
    const filters = [];
    if (params.patientId)
      filters.push(eq(postnatal_cares.patientId, params.patientId));
    if (params.pregnancyId)
      filters.push(eq(postnatal_cares.pregnancyId, params.pregnancyId));

    const where =
      filters.length > 0
        ? this.withFacilityScope(and(...filters))
        : this.withFacilityScope();

    const result = await db
      .select({ count: count() })
      .from(postnatal_cares)
      .innerJoin(pregnancies, eq(postnatal_cares.pregnancyId, pregnancies.id))
      .where(where);
    return Number(result[0]?.count ?? 0);
  }

  public async listPostnatalCares(params: {
    patientId?: string;
    pregnancyId?: string;
    page: number;
    pageSize: number;
  }) {
    const offset = (params.page - 1) * params.pageSize;

    const filters = [];
    if (params.patientId)
      filters.push(eq(postnatal_cares.patientId, params.patientId));
    if (params.pregnancyId)
      filters.push(eq(postnatal_cares.pregnancyId, params.pregnancyId));

    const where =
      filters.length > 0
        ? this.withFacilityScope(and(...filters))
        : this.withFacilityScope();

    const items = await db
      .select()
      .from(postnatal_cares)
      .innerJoin(pregnancies, eq(postnatal_cares.pregnancyId, pregnancies.id))
      .where(where)
      .orderBy(desc(postnatal_cares.visitDate))
      .limit(params.pageSize)
      .offset(offset);

    return items.map((r) => r.postnatal_cares);
  }
}
