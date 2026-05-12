import { db } from "../../db";
import { complaints, encounters, visits } from "../../db/schema";
import { FacilityContext } from "../../context/facility-context";
import { FacilityRepository } from "../../core/facility-repository";
import { SQL, and, desc, eq, gte, lte, sql } from "drizzle-orm";

export class ComplaintsRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, visits.facilityId);
  }

  public async findByPatientId(params: {
    patientId: string;
    visitId?: string;
    from?: string;
    to?: string;
    page: number;
    pageSize: number;
  }) {
    const offset = (params.page - 1) * params.pageSize;
    const dateExpr = sql`coalesce(${encounters.encounterAt}, ${visits.date})`;

    const filters: Array<SQL | undefined> = [eq(visits.patientId, params.patientId)];
    if (params.visitId) filters.push(eq(complaints.visitId, params.visitId));
    if (params.from) filters.push(gte(sql`${dateExpr}::date`, sql`${params.from}::date`));
    if (params.to) filters.push(lte(sql`${dateExpr}::date`, sql`${params.to}::date`));

    const items = await db
      .select({
        id: complaints.id,
        title: complaints.title,
        duration: complaints.duration,
        durationUnit: complaints.durationUnit,
        severity: complaints.severity,
        description: complaints.description,
        visitId: complaints.visitId,
        encounterId: complaints.encounterId,
        createdAt: complaints.createdAt,
        updatedAt: complaints.updatedAt,
        encounterAt: encounters.encounterAt,
        encounterType: encounters.encounterType,
        doctorId: encounters.doctorId,
        visitDate: visits.date,
      })
      .from(complaints)
      .innerJoin(visits, eq(complaints.visitId, visits.id))
      .leftJoin(encounters, eq(complaints.encounterId, encounters.id))
      .where(this.withFacilityScope(and(...(filters.filter(Boolean) as SQL[]))))
      .orderBy(desc(dateExpr))
      .limit(params.pageSize)
      .offset(offset);

    return items;
  }
}
