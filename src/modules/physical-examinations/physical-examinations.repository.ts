import { db } from "../../db";
import { encounters, physical_examinations, visits } from "../../db/schema";
import { FacilityContext } from "../../context/facility-context";
import { FacilityRepository } from "../../core/facility-repository";
import { SQL, and, desc, eq, gte, lte, sql } from "drizzle-orm";

export class PhysicalExaminationsRepository extends FacilityRepository {
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
    if (params.visitId) filters.push(eq(physical_examinations.visitId, params.visitId));
    if (params.from) filters.push(gte(sql`${dateExpr}::date`, sql`${params.from}::date`));
    if (params.to) filters.push(lte(sql`${dateExpr}::date`, sql`${params.to}::date`));

    const items = await db
      .select({
        id: physical_examinations.id,
        generalCondition: physical_examinations.generalCondition,
        chest: physical_examinations.chest,
        cvs: physical_examinations.cvs,
        cns: physical_examinations.cns,
        perabdominal: physical_examinations.perabdominal,
        localExamination: physical_examinations.localExamination,
        visitId: physical_examinations.visitId,
        encounterId: physical_examinations.encounterId,
        createdAt: physical_examinations.createdAt,
        updatedAt: physical_examinations.updatedAt,
        encounterAt: encounters.encounterAt,
        encounterType: encounters.encounterType,
        doctorId: encounters.doctorId,
        visitDate: visits.date,
      })
      .from(physical_examinations)
      .innerJoin(visits, eq(physical_examinations.visitId, visits.id))
      .leftJoin(encounters, eq(physical_examinations.encounterId, encounters.id))
      .where(this.withFacilityScope(and(...(filters.filter(Boolean) as SQL[]))))
      .orderBy(desc(dateExpr))
      .limit(params.pageSize)
      .offset(offset);

    return items;
  }
}
