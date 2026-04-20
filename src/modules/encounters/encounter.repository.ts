import { db } from "../../db";
import { encounters } from "../../db/schema";
import { FacilityContext } from "../../context/facility-context";
import { FacilityRepository } from "../../core/facility-repository";
import { and, desc, eq } from "drizzle-orm";

export class EncounterRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, encounters.facilityId);
  }

  public async findById(id: string) {
    const result = await db
      .select()
      .from(encounters)
      .where(this.withFacilityScope(eq(encounters.id, id)))
      .limit(1);
    return result[0] ?? null;
  }

  public async findAll(params: {
    visitId?: string;
    patientId?: string;
    doctorId?: string;
    page: number;
    pageSize: number;
  }) {
    const { visitId, patientId, doctorId, page, pageSize } = params;
    const offset = (page - 1) * pageSize;

    const filters = [];
    if (visitId) filters.push(eq(encounters.visitId, visitId));
    if (patientId) filters.push(eq(encounters.patientId, patientId));
    if (doctorId) filters.push(eq(encounters.doctorId, doctorId));

    const where =
      filters.length > 0
        ? this.withFacilityScope(and(...filters))
        : this.withFacilityScope();

    const items = await db
      .select()
      .from(encounters)
      .where(where)
      .orderBy(desc(encounters.encounterAt))
      .limit(pageSize)
      .offset(offset);

    return items;
  }
}
