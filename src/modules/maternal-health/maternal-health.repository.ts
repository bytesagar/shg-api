import { db } from "../../db";
import {
  antenatal_cares,
  encounters,
  deliveries,
  pregnancies,
  postnatal_cares,
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

  public async createPregnancy(
    tx: any,
    data: {
      patientId: string;
      firstVisit: Date;
      gravida: string;
      para?: string | null;
      lastMenstruationPeriod?: Date | null;
      expectedDeliveryDate?: Date | null;
      assignedFchvId?: string | null;
      visitId: string;
      encounterId: string;
      createdBy: string;
      updatedBy: string;
    },
  ) {
    const inserted = await tx
      .insert(pregnancies)
      .values({
        ...data,
        facilityId: this.context.facilityId,
      })
      .returning();
    return inserted[0] ?? null;
  }

  public async findPregnancyById(id: string) {
    const result = await db
      .select()
      .from(pregnancies)
      .where(this.withFacilityScope(eq(pregnancies.id, id)))
      .limit(1);
    return result[0] ?? null;
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
      ancVisitDate?: Date | null;
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
      nextVisitSchedule?: Date | null;
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
      deliveryDate?: Date | null;
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
    },
  ) {
    const inserted = await tx.insert(deliveries).values(data).returning();
    return inserted[0] ?? null;
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
      visitDate: Date;
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
    },
  ) {
    const inserted = await tx.insert(postnatal_cares).values(data).returning();
    return inserted[0] ?? null;
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
