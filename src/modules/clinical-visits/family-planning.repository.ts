import { db } from "../../db";
import {
  family_plannings,
  family_planning_news,
  family_planning_olds,
  family_planning_removals,
  fp_hormonal_details,
  fp_iucd_details,
} from "../../db/schema";
import { FacilityContext } from "../../context/facility-context";
import { FacilityRepository } from "../../core/facility-repository";
import { and, count, desc, eq } from "drizzle-orm";

export class FamilyPlanningRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, family_plannings.facilityId);
  }

  public async findById(id: string) {
    const result = await db
      .select()
      .from(family_plannings)
      .where(this.withFacilityScope(eq(family_plannings.id, id)))
      .limit(1);
    return result[0];
  }

  public async findByIdWithDetails(id: string) {
    const rows = await db
      .select({
        familyPlanning: family_plannings,
        newDetails: family_planning_news,
        removalDetails: family_planning_removals,
        previous: family_planning_olds,
        hormonalDetails: fp_hormonal_details,
        iucdDetails: fp_iucd_details,
      })
      .from(family_plannings)
      .leftJoin(
        family_planning_news,
        eq(family_planning_news.familyPlanningId, family_plannings.id),
      )
      .leftJoin(
        family_planning_removals,
        eq(family_planning_removals.familyPlanningId, family_plannings.id),
      )
      .leftJoin(
        family_planning_olds,
        eq(family_planning_olds.id, family_planning_news.previousDeviceId),
      )
      .leftJoin(
        fp_hormonal_details,
        eq(fp_hormonal_details.newFpId, family_planning_news.id),
      )
      .leftJoin(fp_iucd_details, eq(fp_iucd_details.newFpId, family_planning_news.id))
      .where(this.withFacilityScope(eq(family_plannings.id, id)))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      familyPlanning: row.familyPlanning,
      details:
        row.familyPlanning.serviceType === "removal"
          ? row.removalDetails
          : row.newDetails
            ? {
                ...row.newDetails,
                previous: row.previous,
                hormonalDetails: row.hormonalDetails,
                iucdDetails: row.iucdDetails,
              }
            : null,
    };
  }

  public async list(params: { patientId?: string; page: number; pageSize: number }) {
    const offset = (params.page - 1) * params.pageSize;

    const filters = [];
    if (params.patientId) filters.push(eq(family_plannings.patientId, params.patientId));
    const where =
      filters.length > 0
        ? this.withFacilityScope(and(...filters))
        : this.withFacilityScope();

    const [rows, totalResult] = await Promise.all([
      db
        .select({
          familyPlanning: family_plannings,
          newDetails: family_planning_news,
          removalDetails: family_planning_removals,
          previous: family_planning_olds,
          hormonalDetails: fp_hormonal_details,
          iucdDetails: fp_iucd_details,
        })
        .from(family_plannings)
        .leftJoin(
          family_planning_news,
          eq(family_planning_news.familyPlanningId, family_plannings.id),
        )
        .leftJoin(
          family_planning_removals,
          eq(family_planning_removals.familyPlanningId, family_plannings.id),
        )
        .leftJoin(
          family_planning_olds,
          eq(family_planning_olds.id, family_planning_news.previousDeviceId),
        )
        .leftJoin(
          fp_hormonal_details,
          eq(fp_hormonal_details.newFpId, family_planning_news.id),
        )
        .leftJoin(
          fp_iucd_details,
          eq(fp_iucd_details.newFpId, family_planning_news.id),
        )
        .where(where)
        .orderBy(desc(family_plannings.serviceDate))
        .limit(params.pageSize)
        .offset(offset),
      db.select({ count: count() }).from(family_plannings).where(where),
    ]);

    return {
      items: rows.map((row) => ({
        familyPlanning: row.familyPlanning,
        details:
          row.familyPlanning.serviceType === "removal"
            ? row.removalDetails
            : row.newDetails
              ? {
                  ...row.newDetails,
                  previous: row.previous,
                  hormonalDetails: row.hormonalDetails,
                  iucdDetails: row.iucdDetails,
                }
              : null,
      })),
      total: Number(totalResult[0]?.count ?? 0),
    };
  }

  public async create(data: typeof family_plannings.$inferInsert) {
    const inserted = await db.insert(family_plannings).values(data).returning();
    return inserted[0];
  }
}
