import { db } from "../../db";
import { health_facilities, user_facility_affiliations, users } from "../../db/schema";
import { HealthFacilityCreateInput } from "./health-facility.validation";
import { and, count, desc, eq, ilike } from "drizzle-orm";
import { FacilityContext } from "../../context/facility-context";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";

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

  public async upsertDoctorAffiliation(params: {
    facilityId: string;
    doctorId: string;
    roleId?: string | null;
  }) {
    if (this.context.role !== "admin" && params.facilityId !== this.context.facilityId) {
      throw new AppError(
        "Forbidden: cross-facility affiliation change denied",
        HTTP_STATUS.FORBIDDEN,
      );
    }

    const [facility] = await db
      .select({ id: health_facilities.id })
      .from(health_facilities)
      .where(eq(health_facilities.id, params.facilityId))
      .limit(1);
    if (!facility) {
      throw new AppError("Health facility not found", HTTP_STATUS.NOT_FOUND);
    }

    const [doctor] = await db
      .select({ id: users.id, userType: users.userType })
      .from(users)
      .where(eq(users.id, params.doctorId))
      .limit(1);
    if (!doctor) {
      throw new AppError("User not found", HTTP_STATUS.NOT_FOUND);
    }
    if (doctor.userType !== "doctor") {
      throw new AppError("User is not a doctor", HTTP_STATUS.BAD_REQUEST);
    }

    const now = new Date();
    const [existing] = await db
      .select({ id: user_facility_affiliations.id })
      .from(user_facility_affiliations)
      .where(
        and(
          eq(user_facility_affiliations.userId, params.doctorId),
          eq(user_facility_affiliations.facilityId, params.facilityId),
        ),
      )
      .limit(1);

    if (existing) {
      const updated = await db
        .update(user_facility_affiliations)
        .set({
          isActive: true,
          roleId: params.roleId ?? null,
          updatedAt: now,
        })
        .where(eq(user_facility_affiliations.id, existing.id))
        .returning();
      return updated[0] ?? null;
    }

    const inserted = await db
      .insert(user_facility_affiliations)
      .values({
        userId: params.doctorId,
        facilityId: params.facilityId,
        roleId: params.roleId ?? null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return inserted[0] ?? null;
  }

  public async deactivateDoctorAffiliation(params: {
    facilityId: string;
    doctorId: string;
  }) {
    if (this.context.role !== "admin" && params.facilityId !== this.context.facilityId) {
      throw new AppError(
        "Forbidden: cross-facility affiliation change denied",
        HTTP_STATUS.FORBIDDEN,
      );
    }

    const now = new Date();
    const updated = await db
      .update(user_facility_affiliations)
      .set({ isActive: false, updatedAt: now })
      .where(
        and(
          eq(user_facility_affiliations.userId, params.doctorId),
          eq(user_facility_affiliations.facilityId, params.facilityId),
        ),
      )
      .returning();

    return updated[0] ?? null;
  }
}
