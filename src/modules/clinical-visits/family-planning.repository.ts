import { db } from "../../db";
import { family_plannings } from "../../db/schema";
import { FacilityContext } from "../../context/facility-context";
import { FacilityRepository } from "../../core/facility-repository";
import { eq } from "drizzle-orm";

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

  public async create(data: typeof family_plannings.$inferInsert) {
    const inserted = await db.insert(family_plannings).values(data).returning();
    return inserted[0];
  }
}
