import { db } from "../../db";
import { encounters, provisional_diagnoses, visits } from "../../db/schema";
import { FacilityContext } from "../../context/facility-context";
import { FacilityRepository } from "../../core/facility-repository";
import { SQL, and, desc, eq, gte, lte, sql } from "drizzle-orm";

export class ProvisionalDiagnosesRepository extends FacilityRepository {
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
    if (params.visitId) filters.push(eq(provisional_diagnoses.visitId, params.visitId));
    if (params.from) filters.push(gte(sql`${dateExpr}::date`, sql`${params.from}::date`));
    if (params.to) filters.push(lte(sql`${dateExpr}::date`, sql`${params.to}::date`));

    const items = await db
      .select({
        id: provisional_diagnoses.id,
        description: provisional_diagnoses.description,
        visitId: provisional_diagnoses.visitId,
        encounterId: provisional_diagnoses.encounterId,
        createdAt: provisional_diagnoses.createdAt,
        updatedAt: provisional_diagnoses.updatedAt,
        encounterAt: encounters.encounterAt,
        encounterType: encounters.encounterType,
        doctorId: encounters.doctorId,
        visitDate: visits.date,
      })
      .from(provisional_diagnoses)
      .innerJoin(visits, eq(provisional_diagnoses.visitId, visits.id))
      .leftJoin(encounters, eq(provisional_diagnoses.encounterId, encounters.id))
      .where(this.withFacilityScope(and(...(filters.filter(Boolean) as SQL[]))))
      .orderBy(desc(dateExpr))
      .limit(params.pageSize)
      .offset(offset);

    return items;
  }
}
