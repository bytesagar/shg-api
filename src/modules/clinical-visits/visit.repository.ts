import { db } from "../../db";
import { visits } from "../../db/schema";
import { FacilityContext } from "../../context/facility-context";
import { FacilityRepository } from "../../core/facility-repository";
import { SQL, and, desc, eq, inArray, isNull, or } from "drizzle-orm";

export class VisitRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, visits.facilityId);
  }

  public async findById(id: string) {
    const result = await db
      .select()
      .from(visits)
      .where(this.withFacilityScope(eq(visits.id, id)))
      .limit(1);
    return result[0];
  }

  public async findByPatientId(patientId: string) {
    const result = await db
      .select()
      .from(visits)
      .where(this.withFacilityScope(eq(visits.patientId, patientId)))
      .limit(1);
    return result[0];
  }

  public async findActiveByPatientId(patientId: string) {
    const activeStatuses = ["planned", "arrived", "in_progress"] as const;
    const result = await db
      .select()
      .from(visits)
      .where(
        this.withFacilityScope(
          and(
            eq(visits.patientId, patientId),
            or(inArray(visits.status, activeStatuses), isNull(visits.status)),
          ),
        ),
      )
      .orderBy(desc(visits.date))
      .limit(1);
    return result[0] ?? null;
  }

  public async create(data: {
    patientId: string;
    facilityId: string;
    date: Date;
    reason: string;
    service?: string | null;
    status?:
      | "planned"
      | "arrived"
      | "in_progress"
      | "finished"
      | "cancelled"
      | null;
    doctorId?: string | null;
  }) {
    const inserted = await db.insert(visits).values(data).returning();
    return inserted[0];
  }
  public async findAll(where?: SQL) {
    const result = await db
      .select()
      .from(visits)
      .where(this.withFacilityScope(where));
    return result;
  }
  public async findAllByPatientId(patientId: string) {
    const result = await db
      .select()
      .from(visits)
      .where(this.withFacilityScope(eq(visits.patientId, patientId)))
      .orderBy(desc(visits.createdAt));
    return result;
  }

  public async updateStatus(params: {
    id: string;
    status: "planned" | "arrived" | "in_progress" | "finished" | "cancelled";
  }) {
    const updated = await db
      .update(visits)
      .set({
        status: params.status,
        updatedAt: new Date(),
      })
      .where(this.withFacilityScope(eq(visits.id, params.id)))
      .returning();
    return updated[0] ?? null;
  }
}
