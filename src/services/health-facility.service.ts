import { db } from "../db";
import { health_facilities } from "../db/schema";
import { HealthFacilityCreateInput } from "../validations/health-facility.validation";
import { and, count, desc, eq, ilike } from "drizzle-orm";
import { FacilityContext } from "../context/facility-context";

export class HealthFacilityService {
  constructor(private readonly context: FacilityContext) {}

  public async createHealthFacility(data: HealthFacilityCreateInput) {
    const result = await db.insert(health_facilities).values(data).returning();
    return result[0];
  }

  public async getHealthFacilities(params: {
    page: number;
    pageSize: number;
    searchString?: string;
    municipalityId?: string;
  }) {
    const filters = [];

    filters.push(eq(health_facilities.id, this.context.facilityId));

    if (params.municipalityId) {
      filters.push(eq(health_facilities.municipalityId, params.municipalityId));
    }

    if (params.searchString) {
      filters.push(ilike(health_facilities.name, `%${params.searchString}%`));
    }

    const whereClause = filters.length ? and(...filters) : undefined;

    const totalResult = await db
      .select({ count: count() })
      .from(health_facilities)
      .where(whereClause);

    const items = await db
      .select()
      .from(health_facilities)
      .where(whereClause)
      .orderBy(desc(health_facilities.createdAt))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize);

    return {
      items,
      total: Number(totalResult[0]?.count ?? 0),
      page: params.page,
      pageSize: params.pageSize,
    };
  }
}
