import { db } from "../../db";
import { health_facilities, user_facility_affiliations, users } from "../../db/schema";
import {
  HealthFacilityCreateInput,
  HealthFacilityUpdateInput,
} from "./health-facility.validation";
import { and, eq, inArray, sql } from "drizzle-orm";
import { FacilityContext } from "../../context/facility-context";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";

export class HealthFacilityService {
  constructor(private readonly context: FacilityContext) {}

  public async createHealthFacility(data: HealthFacilityCreateInput) {
    const result = await db.insert(health_facilities).values(data).returning();
    return result[0];
  }

  /**
   * Update a facility. Admins may edit any facility; every other role is
   * restricted to their own (the one in their active context). 404 if the row
   * doesn't exist, 403 on a cross-facility attempt by a non-admin.
   */
  public async updateHealthFacility(
    id: string,
    data: HealthFacilityUpdateInput,
  ) {
    if (this.context.role !== "admin" && id !== this.context.facilityId) {
      throw new AppError(
        "Forbidden: cannot edit another facility",
        HTTP_STATUS.FORBIDDEN,
      );
    }

    const [existing] = await db
      .select({ id: health_facilities.id })
      .from(health_facilities)
      .where(eq(health_facilities.id, id))
      .limit(1);
    if (!existing) {
      throw new AppError("Health facility not found", HTTP_STATUS.NOT_FOUND);
    }

    const [updated] = await db
      .update(health_facilities)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(health_facilities.id, id))
      .returning();
    return updated;
  }

  public async getHealthFacilities(params: {
    page: number;
    pageSize: number;
    searchString?: string;
    municipalityId?: string;
  }) {
    const limit = params.pageSize;
    const offset = (params.page - 1) * params.pageSize;

    const search = params.searchString?.trim()
      ? `%${params.searchString.trim()}%`
      : null;
    const municipalityId = params.municipalityId?.trim()
      ? params.municipalityId.trim()
      : null;

    const doctorsLateral = sql`
      left join lateral (
        select
          coalesce(
            jsonb_agg(
              jsonb_build_object(
                'id', d.doctor_id,
                'firstName', d.first_name,
                'lastName', d.last_name,
                'designation', d.designation,
                'specialization', d.specialization,
                'roleId', d.role_id
              )
              order by d.first_name nulls last, d.last_name nulls last
            ),
            '[]'::jsonb
          ) as doctors
        from (
          select
            s.doctor_id,
            max(s.first_name) as first_name,
            max(s.last_name) as last_name,
            max(s.designation) as designation,
            max(s.specialization) as specialization,
            max(s.role_id) as role_id
          from (
            select
              du.id as doctor_id,
              du.first_name,
              du.last_name,
              up.designation,
              up.specialization,
              null::text as role_id
            from users du
            left join user_profiles up on up.user_id = du.id
            where du.user_type = 'doctor'
              and du.facility_id = hf.id
              and du.deleted_at is null
            union all
            select
              du.id as doctor_id,
              du.first_name,
              du.last_name,
              up.designation,
              up.specialization,
              a.role_id::text
            from user_facility_affiliations a
            join users du on du.id = a.user_id
            left join user_profiles up on up.user_id = du.id
            where a.facility_id = hf.id
              and a.is_active = true
              and du.user_type = 'doctor'
              and du.deleted_at is null
          ) s
          group by s.doctor_id
        ) d
      ) docs on true
    `;

    if (this.context.role === "doctor") {
      const result = await db.execute<{
        id: string;
        name: string;
        address: string;
        phone: string;
        email: string;
        ward: string;
        palika: string;
        district: string;
        province: string;
        provinceId: string | null;
        districtId: string | null;
        municipalityId: string | null;
        inchargeName: string;
        hfCode: string | null;
        authorityLevel: string | null;
        authority: string | null;
        ownership: string | null;
        facilityType: string | null;
        createdAt: Date;
        updatedAt: Date | null;
        deletedBy: string | null;
        deletedAt: Date | null;
        isPrimary: boolean;
        roleId: string | null;
        affiliatedDoctors: unknown;
        total: number;
      }>(sql`
        select
          hf.id,
          hf.name,
          hf.address,
          hf.phone,
          hf.email,
          hf.ward,
          hf.palika,
          hf.district,
          hf.province,
          hf.province_id as "provinceId",
          hf.district_id as "districtId",
          hf.municipality_id as "municipalityId",
          hf.incharge_name as "inchargeName",
          hf.hf_code as "hfCode",
          hf.authority_level as "authorityLevel",
          hf.authority,
          hf.ownership,
          hf.facility_type as "facilityType",
          hf.created_at as "createdAt",
          hf.updated_at as "updatedAt",
          hf.deleted_by as "deletedBy",
          hf.deleted_at as "deletedAt",
          (hf.id = u.facility_id) as "isPrimary",
          ufa.role_id::text as "roleId",
          docs.doctors as "affiliatedDoctors",
          count(*) over() as "total"
        from health_facilities hf
        join users u on u.id = ${this.context.userId}::uuid
        left join user_facility_affiliations ufa
          on ufa.user_id = u.id
         and ufa.facility_id = hf.id
         and ufa.is_active = true
        ${doctorsLateral}
        where
          (hf.id = u.facility_id or ufa.id is not null)
          and (${municipalityId}::uuid is null or hf.municipality_id = ${municipalityId}::uuid)
          and (${search}::text is null or hf.name ilike ${search}::text)
        order by hf.created_at desc
        limit ${limit}
        offset ${offset}
      `);

      const rows = result.rows;
      const total = Number(rows[0]?.total ?? 0);
      const items = rows.map(
        ({ total: _total, affiliatedDoctors, ...rest }) => ({
          ...rest,
          affiliatedDoctors: (affiliatedDoctors ?? []) as any[],
        }),
      );
      return { items, total, page: params.page, pageSize: params.pageSize };
    }

    if (this.context.role === "admin") {
      const result = await db.execute<{
        id: string;
        name: string;
        address: string;
        phone: string;
        email: string;
        ward: string;
        palika: string;
        district: string;
        province: string;
        provinceId: string | null;
        districtId: string | null;
        municipalityId: string | null;
        inchargeName: string;
        hfCode: string | null;
        authorityLevel: string | null;
        authority: string | null;
        ownership: string | null;
        facilityType: string | null;
        createdAt: Date;
        updatedAt: Date | null;
        deletedBy: string | null;
        deletedAt: Date | null;
        isPrimary: boolean;
        roleId: string | null;
        affiliatedDoctors: unknown;
        total: number;
      }>(sql`
        select
          hf.id,
          hf.name,
          hf.address,
          hf.phone,
          hf.email,
          hf.ward,
          hf.palika,
          hf.district,
          hf.province,
          hf.province_id as "provinceId",
          hf.district_id as "districtId",
          hf.municipality_id as "municipalityId",
          hf.incharge_name as "inchargeName",
          hf.hf_code as "hfCode",
          hf.authority_level as "authorityLevel",
          hf.authority,
          hf.ownership,
          hf.facility_type as "facilityType",
          hf.created_at as "createdAt",
          hf.updated_at as "updatedAt",
          hf.deleted_by as "deletedBy",
          hf.deleted_at as "deletedAt",
          (hf.id = ${this.context.facilityId}::uuid) as "isPrimary",
          null::text as "roleId",
          docs.doctors as "affiliatedDoctors",
          count(*) over() as "total"
        from health_facilities hf
        ${doctorsLateral}
        where
          (${municipalityId}::uuid is null or hf.municipality_id = ${municipalityId}::uuid)
          and (${search}::text is null or hf.name ilike ${search}::text)
        order by hf.created_at desc
        limit ${limit}
        offset ${offset}
      `);

      const rows = result.rows;
      const total = Number(rows[0]?.total ?? 0);
      const items = rows.map(
        ({ total: _total, affiliatedDoctors, ...rest }) => ({
          ...rest,
          affiliatedDoctors: (affiliatedDoctors ?? []) as any[],
        }),
      );
      return { items, total, page: params.page, pageSize: params.pageSize };
    }

    const result = await db.execute<{
      id: string;
      name: string;
      address: string;
      phone: string;
      email: string;
      ward: string;
      palika: string;
      district: string;
      province: string;
      provinceId: string | null;
      districtId: string | null;
      municipalityId: string | null;
      inchargeName: string;
      hfCode: string | null;
      authorityLevel: string | null;
      authority: string | null;
      ownership: string | null;
      facilityType: string | null;
      createdAt: Date;
      updatedAt: Date | null;
      deletedBy: string | null;
      deletedAt: Date | null;
      isPrimary: boolean;
      roleId: string | null;
      affiliatedDoctors: unknown;
      total: number;
    }>(sql`
      select
        hf.id,
        hf.name,
        hf.address,
        hf.phone,
        hf.email,
        hf.ward,
        hf.palika,
        hf.district,
        hf.province,
        hf.province_id as "provinceId",
        hf.district_id as "districtId",
        hf.municipality_id as "municipalityId",
        hf.incharge_name as "inchargeName",
        hf.hf_code as "hfCode",
        hf.authority_level as "authorityLevel",
        hf.authority,
        hf.ownership,
        hf.facility_type as "facilityType",
        hf.created_at as "createdAt",
        hf.updated_at as "updatedAt",
        hf.deleted_by as "deletedBy",
        hf.deleted_at as "deletedAt",
        true as "isPrimary",
        null::text as "roleId",
        docs.doctors as "affiliatedDoctors",
        count(*) over() as "total"
      from health_facilities hf
      ${doctorsLateral}
      where
        hf.id = ${this.context.facilityId}::uuid
        and (${municipalityId}::uuid is null or hf.municipality_id = ${municipalityId}::uuid)
        and (${search}::text is null or hf.name ilike ${search}::text)
      order by hf.created_at desc
      limit ${limit}
      offset ${offset}
    `);

    const rows = result.rows;
    const total = Number(rows[0]?.total ?? 0);
    const items = rows.map(({ total: _total, affiliatedDoctors, ...rest }) => ({
      ...rest,
      affiliatedDoctors: (affiliatedDoctors ?? []) as any[],
    }));
    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  public async upsertDoctorAffiliation(params: {
    facilityId: string;
    doctorId: string;
    roleId?: string | null;
  }) {
    const result = await this.upsertDoctorAffiliations({
      facilityId: params.facilityId,
      doctorIds: [params.doctorId],
      roleId: params.roleId ?? null,
    });
    return result.items[0] ?? null;
  }

  public async upsertDoctorAffiliations(params: {
    facilityId: string;
    doctorIds: string[];
    roleId?: string | null;
  }) {
    if (this.context.role !== "admin" && params.facilityId !== this.context.facilityId) {
      throw new AppError(
        "Forbidden: cross-facility affiliation change denied",
        HTTP_STATUS.FORBIDDEN,
      );
    }

    const doctorIds = [...new Set(params.doctorIds)];
    if (doctorIds.length === 0) {
      throw new AppError("doctorIds is required", HTTP_STATUS.BAD_REQUEST);
    }

    return db.transaction(async (tx) => {
      const [facility] = await tx
        .select({ id: health_facilities.id })
        .from(health_facilities)
        .where(eq(health_facilities.id, params.facilityId))
        .limit(1);
      if (!facility) {
        throw new AppError("Health facility not found", HTTP_STATUS.NOT_FOUND);
      }

      const doctors = await tx
        .select({ id: users.id, userType: users.userType })
        .from(users)
        .where(inArray(users.id, doctorIds));

      if (doctors.length !== doctorIds.length) {
        throw new AppError("User not found", HTTP_STATUS.NOT_FOUND);
      }
      if (doctors.some((d) => d.userType !== "doctor")) {
        throw new AppError("User is not a doctor", HTTP_STATUS.BAD_REQUEST);
      }

      const existing = await tx
        .select({
          id: user_facility_affiliations.id,
          userId: user_facility_affiliations.userId,
          isActive: user_facility_affiliations.isActive,
        })
        .from(user_facility_affiliations)
        .where(
          and(
            eq(user_facility_affiliations.facilityId, params.facilityId),
            inArray(user_facility_affiliations.userId, doctorIds),
          ),
        );

      if (existing.some((e) => e.isActive === true)) {
        throw new AppError(
          "Doctor is already affiliated with this facility",
          HTTP_STATUS.CONFLICT,
        );
      }

      const now = new Date();
      const existingByUserId = new Map(existing.map((e) => [e.userId, e]));
      const reactivateUserIds = existing
        .filter((e) => e.isActive === false)
        .map((e) => e.userId);
      const insertUserIds = doctorIds.filter((id) => !existingByUserId.has(id));

      const out: Array<typeof user_facility_affiliations.$inferSelect> = [];

      if (reactivateUserIds.length > 0) {
        const updated = await tx
          .update(user_facility_affiliations)
          .set({
            isActive: true,
            roleId: params.roleId ?? null,
            updatedAt: now,
          })
          .where(
            and(
              eq(user_facility_affiliations.facilityId, params.facilityId),
              inArray(user_facility_affiliations.userId, reactivateUserIds),
            ),
          )
          .returning();
        out.push(...updated);
      }

      if (insertUserIds.length > 0) {
        try {
          const inserted = await tx
            .insert(user_facility_affiliations)
            .values(
              insertUserIds.map((doctorId) => ({
                userId: doctorId,
                facilityId: params.facilityId,
                roleId: params.roleId ?? null,
                isActive: true,
                createdAt: now,
                updatedAt: now,
              })),
            )
            .returning();
          out.push(...inserted);
        } catch (err: any) {
          const code = err?.code;
          if (code === "23505") {
            throw new AppError(
              "Doctor is already affiliated with this facility",
              HTTP_STATUS.CONFLICT,
            );
          }
          throw err;
        }
      }

      return { items: out };
    });
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
