import { db } from "../../db";
import { attachments, encounters, tests, visits } from "../../db/schema";
import { FacilityContext } from "../../context/facility-context";
import { FacilityRepository } from "../../core/facility-repository";
import { SQL, and, desc, eq, gte, lte, sql } from "drizzle-orm";

export type TestCategoryFilter = "lab" | "imaging" | "other";

export class TestsRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, visits.facilityId);
  }

  public async findByPatientId(params: {
    patientId: string;
    visitId?: string;
    from?: string;
    to?: string;
    testCategory?: TestCategoryFilter;
    page: number;
    pageSize: number;
  }) {
    const offset = (params.page - 1) * params.pageSize;
    const dateExpr = sql`coalesce(${encounters.encounterAt}, ${visits.date})`;

    const filters: Array<SQL | undefined> = [eq(visits.patientId, params.patientId)];
    if (params.visitId) filters.push(eq(tests.visitId, params.visitId));
    if (params.from) filters.push(gte(sql`${dateExpr}::date`, sql`${params.from}::date`));
    if (params.to) filters.push(lte(sql`${dateExpr}::date`, sql`${params.to}::date`));
    if (params.testCategory) filters.push(eq(tests.testCategory, params.testCategory));

    const items = await db
      .select({
        id: tests.id,
        testName: tests.testName,
        testResult: tests.testResult,
        testCategory: tests.testCategory,
        visitId: tests.visitId,
        encounterId: tests.encounterId,
        attachmentId: tests.attachmentId,
        attachmentName: attachments.name,
        attachmentFileType: attachments.fileType,
        createdAt: tests.createdAt,
        updatedAt: tests.updatedAt,
        encounterAt: encounters.encounterAt,
        encounterType: encounters.encounterType,
        doctorId: encounters.doctorId,
        visitDate: visits.date,
      })
      .from(tests)
      .innerJoin(visits, eq(tests.visitId, visits.id))
      .leftJoin(encounters, eq(tests.encounterId, encounters.id))
      .leftJoin(attachments, eq(tests.attachmentId, attachments.id))
      .where(this.withFacilityScope(and(...(filters.filter(Boolean) as SQL[]))))
      .orderBy(desc(dateExpr))
      .limit(params.pageSize)
      .offset(offset);

    return items;
  }
}
