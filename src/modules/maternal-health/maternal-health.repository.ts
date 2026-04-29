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
