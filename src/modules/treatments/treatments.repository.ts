import { db } from "../../db";
import { encounters, treatments, visits } from "../../db/schema";
import { FacilityContext } from "../../context/facility-context";
import { FacilityRepository } from "../../core/facility-repository";
import { SQL, and, desc, eq, gte, lte, sql } from "drizzle-orm";

export class TreatmentsRepository extends FacilityRepository {
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
    if (params.visitId) filters.push(eq(treatments.visitId, params.visitId));
    if (params.from) filters.push(gte(sql`${dateExpr}::date`, sql`${params.from}::date`));
    if (params.to) filters.push(lte(sql`${dateExpr}::date`, sql`${params.to}::date`));

    const items = await db
      .select({
        id: treatments.id,
        medicalAdvise: treatments.medicalAdvise,
        followUpText: treatments.followUpText,
        followUpDate: treatments.followUpDate,
        refer: treatments.refer,
        referReason: treatments.referReason,
        visitId: treatments.visitId,
        encounterId: treatments.encounterId,
        createdAt: treatments.createdAt,
        updatedAt: treatments.updatedAt,
        encounterAt: encounters.encounterAt,
        encounterType: encounters.encounterType,
        doctorId: encounters.doctorId,
        visitDate: visits.date,
      })
      .from(treatments)
      .innerJoin(visits, eq(treatments.visitId, visits.id))
      .leftJoin(encounters, eq(treatments.encounterId, encounters.id))
      .where(this.withFacilityScope(and(...(filters.filter(Boolean) as SQL[]))))
      .orderBy(desc(dateExpr))
      .limit(params.pageSize)
      .offset(offset);

    return items;
  }
}
