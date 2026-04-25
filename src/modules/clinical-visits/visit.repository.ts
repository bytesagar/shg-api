import { db } from "../../db";
import { visits } from "../../db/schema";
import { FacilityContext } from "../../context/facility-context";
import { FacilityRepository } from "../../core/facility-repository";
import { SQL, and, eq } from "drizzle-orm";

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
    return result
  }

}
