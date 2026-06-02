import { db } from "../../db";
import {
  auth_sessions,
  person_contacts,
  person_names,
  persons,
  user_profiles,
  health_facilities,
  user_facility_affiliations,
  user_role_assignments,
  user_roles,
  users,
} from "../../db/schema";
import { FacilityContext } from "../../context/facility-context";
import { FacilityRepository } from "../../core/facility-repository";
import {
  SQL,
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";

export class UserRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, users.facilityId);
  }

  /**
   * Doctors are a cross-facility resource (they get access to facilities via
   * `user_facility_affiliations`, not a single home `facilityId`). So any user
   * listing explicitly filtered to doctors is returned globally — otherwise the
   * facility scope would hide doctors who belong to / were created under a
   * different facility, which is exactly what the affiliation selector needs.
   */
  private targetsDoctors(p: { role?: string; userType?: string }): boolean {
    return (
      p.userType === "doctor" || (p.role ?? "").toLowerCase() === "doctor"
    );
  }

  /**
   * Scope for user listings.
   *  - Doctor-targeted listings are returned globally (see `targetsDoctors`).
   *  - Every other listing stays facility-scoped, BUT cross-facility doctors
   *    carry no home `facilityId` (it is NULL by design), so a plain facility
   *    scope would hide them from the general users list. We therefore OR in
   *    `userType = 'doctor'` so doctors always surface alongside the active
   *    facility's own staff.
   */
  private maybeScope(targetsDoctors: boolean, where?: SQL): SQL | undefined {
    if (targetsDoctors) return where;
    const scope = or(
      eq(users.facilityId, this.context.facilityId),
      eq(users.userType, "doctor"),
    )!;
    return where ? and(scope, where) : scope;
  }

  private userSelectBase = {
    id: users.id,
    email: users.email,
    username: users.username,
    firstName: users.firstName,
    lastName: users.lastName,
    userType: users.userType,
    phoneNumber: users.phoneNumber,
    designation: users.designation,
    callStatus: users.callStatus,
    facilityId: users.facilityId,
    municipalityId: users.municipalityId,
    userRoleId: users.userRoleId,
    specialization: users.specialization,
    nmcRegistrationNumber: users.nmcRegistrationNumber,
    signatureUrl: users.signatureUrl,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
  };

  private userSelectWithFacility = {
    ...this.userSelectBase,
    facility: {
      id: health_facilities.id,
      name: health_facilities.name,
      palika: health_facilities.palika,
      district: health_facilities.district,
      province: health_facilities.province,
      ward: health_facilities.ward,
    },
    role: {
      id: user_roles.id,
      name: user_roles.name,
      permissions: user_roles.permissions,
    },
  };

  public async countAll(where?: SQL) {
    const result = await db
      .select({ count: count() })
      .from(users)
      .where(this.withFacilityScope(where));
    return Number(result[0]?.count ?? 0);
  }

  public async countFiltered(params: {
    role?: string;
    userType?: "admin" | "user" | "facility" | "doctor" | "fchv";
    searchString?: string;
  }) {
    const doctors = this.targetsDoctors(params);
    const parts: SQL[] = [];

    if (params.userType) {
      parts.push(eq(users.userType, params.userType));
    }

    if (params.searchString) {
      const q = params.searchString;
      parts.push(
        or(
          ilike(users.firstName, `%${q}%`),
          ilike(users.lastName, `%${q}%`),
          ilike(users.email, `%${q}%`),
          ilike(users.phoneNumber, `%${q}%`),
        )!,
      );
    }

    if (params.role) {
      const cond =
        parts.length > 0
          ? and(eq(user_roles.name, params.role), ...parts)
          : eq(user_roles.name, params.role);
      const where = this.maybeScope(doctors, cond);

      const result = await db
        .select({ count: sql`count(distinct ${users.id})` })
        .from(users)
        .innerJoin(
          user_role_assignments,
          and(
            eq(user_role_assignments.userId, users.id),
            eq(user_role_assignments.isPrimary, true),
          ),
        )
        .innerJoin(user_roles, eq(user_roles.id, user_role_assignments.roleId))
        .where(where);

      return Number(result[0]?.count ?? 0);
    }

    const where = this.maybeScope(
      doctors,
      parts.length > 0 ? and(...parts) : undefined,
    );
    const result = await db.select({ count: count() }).from(users).where(where);
    return Number(result[0]?.count ?? 0);
  }

  public async findAll(where?: SQL, opts?: { limit: number; offset: number }) {
    const base = db
      .select(this.userSelectWithFacility)
      .from(users)
      .leftJoin(health_facilities, eq(health_facilities.id, users.facilityId))
      .leftJoin(user_roles, eq(user_roles.id, users.userRoleId))
      .where(this.withFacilityScope(where));
    if (opts) {
      return base
        .orderBy(desc(users.createdAt))
        .limit(opts.limit)
        .offset(opts.offset);
    }
    return base;
  }

  public async findFiltered(params: {
    role?: string;
    userType?: "admin" | "user" | "facility" | "doctor" | "fchv";
    searchString?: string;
    limit: number;
    offset: number;
  }) {
    const doctors = this.targetsDoctors(params);
    const parts: SQL[] = [];

    if (params.userType) {
      parts.push(eq(users.userType, params.userType));
    }

    if (params.searchString) {
      const q = params.searchString;
      parts.push(
        or(
          ilike(users.firstName, `%${q}%`),
          ilike(users.lastName, `%${q}%`),
          ilike(users.email, `%${q}%`),
          ilike(users.phoneNumber, `%${q}%`),
        )!,
      );
    }

    if (params.role) {
      const cond =
        parts.length > 0
          ? and(eq(user_roles.name, params.role), ...parts)
          : eq(user_roles.name, params.role);
      const where = this.maybeScope(doctors, cond);

      return db
        .select(this.userSelectWithFacility)
        .from(users)
        .leftJoin(health_facilities, eq(health_facilities.id, users.facilityId))
        .innerJoin(
          user_role_assignments,
          and(
            eq(user_role_assignments.userId, users.id),
            eq(user_role_assignments.isPrimary, true),
          ),
        )
        .innerJoin(user_roles, eq(user_roles.id, user_role_assignments.roleId))
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(params.limit)
        .offset(params.offset);
    }

    const where = this.maybeScope(
      doctors,
      parts.length > 0 ? and(...parts) : undefined,
    );

    return db
      .select(this.userSelectWithFacility)
      .from(users)
      .leftJoin(health_facilities, eq(health_facilities.id, users.facilityId))
      .leftJoin(user_roles, eq(user_roles.id, users.userRoleId))
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(params.limit)
      .offset(params.offset);
  }

  public async countAllByRole(role: string) {
    const where = this.maybeScope(
      this.targetsDoctors({ role }),
      eq(user_roles.name, role),
    );
    const result = await db
      .select({ count: count() })
      .from(users)
      .innerJoin(
        user_role_assignments,
        and(
          eq(user_role_assignments.userId, users.id),
          eq(user_role_assignments.isPrimary, true),
        ),
      )
      .innerJoin(user_roles, eq(user_roles.id, user_role_assignments.roleId))
      .where(where);
    return Number(result[0]?.count ?? 0);
  }

  public async findAllByRole(
    role: string,
    opts: { limit: number; offset: number },
  ) {
    const where = this.maybeScope(
      this.targetsDoctors({ role }),
      eq(user_roles.name, role),
    );
    return db
      .select(this.userSelectBase)
      .from(users)
      .innerJoin(
        user_role_assignments,
        and(
          eq(user_role_assignments.userId, users.id),
          eq(user_role_assignments.isPrimary, true),
        ),
      )
      .innerJoin(user_roles, eq(user_roles.id, user_role_assignments.roleId))
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(opts.limit)
      .offset(opts.offset);
  }

  /** Staff types that can appear on a facility roster (excludes global admins). */
  private static readonly rosterAssignableUserTypes = [
    "doctor",
    "user",
    "facility",
  ] as const;

  /**
   * Roster-assignable staff = the active facility's own assignable staff PLUS
   * all cross-facility doctors (who carry no home `facilityId`). Without the
   * doctor OR, decoupled doctors — the primary telehealth roster target — would
   * never appear as assignable.
   */
  private rosterAssignableScope(): SQL {
    return and(
      inArray(users.userType, UserRepository.rosterAssignableUserTypes),
      or(
        eq(users.facilityId, this.context.facilityId),
        eq(users.userType, "doctor"),
      ),
    )!;
  }

  public async countAssignableForRoster() {
    const result = await db
      .select({ count: count() })
      .from(users)
      .where(this.rosterAssignableScope());
    return Number(result[0]?.count ?? 0);
  }

  public async findAssignableForRoster(opts: {
    limit: number;
    offset: number;
  }) {
    return db
      .select(this.userSelectBase)
      .from(users)
      .where(this.rosterAssignableScope())
      .orderBy(desc(users.createdAt))
      .limit(opts.limit)
      .offset(opts.offset);
  }

  public async findById(id: string) {
    // Fetch unscoped, then enforce tenant isolation in code: a doctor is a
    // cross-facility resource and is viewable from any facility, while every
    // other user type must belong to the active facility.
    const result = await db
      .select(this.userSelectWithFacility)
      .from(users)
      .leftJoin(health_facilities, eq(health_facilities.id, users.facilityId))
      .leftJoin(user_roles, eq(user_roles.id, users.userRoleId))
      .where(eq(users.id, id))
      .limit(1);
    const row = result[0];
    if (!row) return undefined;
    if (row.userType !== "doctor" && row.facilityId !== this.context.facilityId) {
      return undefined;
    }
    return row;
  }

  public async findByEmail(email: string) {
    const result = await db
      .select(this.userSelectBase)
      .from(users)
      .where(this.withFacilityScope(eq(users.email, email)))
      .limit(1);
    return result[0];
  }

  public async findRoleNamesByIds(roleIds: string[]) {
    if (roleIds.length === 0) return [] as Array<{ id: string; name: string }>;

    const rows = await db
      .select({
        id: user_roles.id,
        name: user_roles.name,
      })
      .from(user_roles)
      .where(and(inArray(user_roles.id, roleIds), isNull(user_roles.deletedAt)));

    return rows;
  }

  public async create(data: {
    email: string;
    username?: string | null;
    firstName: string;
    lastName: string;
    passwordHash: string;
    userType: "admin" | "user" | "facility" | "doctor" | "fchv";
    phoneNumber: string;
    designation?: string | null;
    municipalityId?: string | null;
    facilityId?: string | null;
    userRoleId: string;
    roleIds?: string[] | null;
    specialization?: string | null;
    nmcRegistrationNumber?: string | null;
    signatureUrl?: string | null;
  }) {
    return db.transaction(async (tx) => {
      const insertedPerson = await tx
        .insert(persons)
        .values({
          status: "active",
        })
        .returning();
      const person = insertedPerson[0];

      await tx.insert(person_names).values({
        personId: person.id,
        use: "official",
        given: data.firstName,
        family: data.lastName,
        isPrimary: true,
      });

      await tx.insert(person_contacts).values({
        personId: person.id,
        system: "phone",
        use: "mobile",
        value: data.phoneNumber,
        isPrimary: true,
      });

      const { roleIds: _roleIds, facilityId: inputFacilityId, ...insertValues } = data;
      const isDoctor = data.userType === "doctor";
      // Facility the new user is being created under (the admin's active
      // facility, or an explicitly chosen one).
      const homeFacilityId = inputFacilityId ?? this.context.facilityId;
      // Doctors are cross-facility and carry no single home `facilityId`; they
      // reach facilities through `user_facility_affiliations` instead. Every
      // other user type keeps the facility pin.
      const facilityId = isDoctor ? null : homeFacilityId;

      const insertedUsers = await tx
        .insert(users)
        .values({
          ...insertValues,
          personId: person.id,
          facilityId,
        })
        .returning(this.userSelectBase);
      const createdUser = insertedUsers[0];

      await tx.insert(user_profiles).values({
        userId: createdUser.id,
        designation: data.designation,
        specialization: data.specialization,
        signatureUrl: data.signatureUrl,
      });

      const extraRoleIds = Array.isArray(data.roleIds)
        ? Array.from(new Set(data.roleIds))
        : [];

      const finalRoleIds = Array.from(
        new Set([data.userRoleId, ...extraRoleIds]),
      );

      const createdUserId = createdUser.id as string;

      await tx.insert(user_role_assignments).values(
        finalRoleIds.map((roleId) => ({
          userId: createdUserId,
          roleId,
          facilityId: isDoctor ? homeFacilityId : facilityId,
          municipalityId: data.municipalityId ?? null,
          isPrimary: roleId === data.userRoleId,
        })),
      );

      // A doctor has no `facilityId` pin, so without an affiliation they could
      // never resolve a facility at login. Affiliate the new doctor to the
      // facility they were created under so they can sign in immediately; an
      // admin can add/remove further facility affiliations afterwards.
      if (isDoctor && homeFacilityId) {
        await tx
          .insert(user_facility_affiliations)
          .values({
            userId: createdUserId,
            facilityId: homeFacilityId,
            roleId: data.userRoleId,
            isActive: true,
          })
          .onConflictDoNothing();
      }

      return createdUser;
    });
  }

  /**
   * Partial update of a user and the normalized rows it owns. Only the fields
   * present in `data` are touched. Keeps `person_names` (primary), the primary
   * `person_contacts` phone, `user_profiles`, and the primary
   * `user_role_assignments` row in sync with the columns on `users`.
   */
  public async update(
    id: string,
    data: {
      email?: string;
      username?: string | null;
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      designation?: string | null;
      municipalityId?: string | null;
      facilityId?: string | null;
      userRoleId?: string;
      specialization?: string | null;
      nmcRegistrationNumber?: string | null;
      signatureUrl?: string | null;
      userType?: "admin" | "user" | "facility" | "doctor" | "fchv";
      passwordHash?: string;
    },
  ) {
    const didUpdate = await db.transaction(async (tx) => {
      const [current] = await tx
        .select({
          id: users.id,
          personId: users.personId,
          userRoleId: users.userRoleId,
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      if (!current) return false;

      const now = new Date();

      // Build the users SET from only the provided fields.
      const userSet: Record<string, unknown> = { updatedAt: now };
      const assign = <K extends string>(key: K, value: unknown) => {
        if (value !== undefined) userSet[key] = value;
      };
      assign("email", data.email);
      assign("username", data.username);
      assign("firstName", data.firstName);
      assign("lastName", data.lastName);
      assign("phoneNumber", data.phoneNumber);
      assign("designation", data.designation);
      assign("municipalityId", data.municipalityId);
      assign("facilityId", data.facilityId);
      assign("userRoleId", data.userRoleId);
      assign("specialization", data.specialization);
      assign("nmcRegistrationNumber", data.nmcRegistrationNumber);
      assign("signatureUrl", data.signatureUrl);
      assign("userType", data.userType);
      assign("passwordHash", data.passwordHash);

      await tx.update(users).set(userSet).where(eq(users.id, id));

      // Primary person name.
      if (data.firstName !== undefined || data.lastName !== undefined) {
        const nameSet: Record<string, unknown> = { updatedAt: now };
        if (data.firstName !== undefined) nameSet.given = data.firstName;
        if (data.lastName !== undefined) nameSet.family = data.lastName;
        await tx
          .update(person_names)
          .set(nameSet)
          .where(
            and(
              eq(person_names.personId, current.personId),
              eq(person_names.isPrimary, true),
            ),
          );
      }

      // Primary phone contact.
      if (data.phoneNumber !== undefined) {
        await tx
          .update(person_contacts)
          .set({ value: data.phoneNumber, updatedAt: now })
          .where(
            and(
              eq(person_contacts.personId, current.personId),
              eq(person_contacts.system, "phone"),
              eq(person_contacts.isPrimary, true),
            ),
          );
      }

      // Profile fields.
      if (
        data.designation !== undefined ||
        data.specialization !== undefined ||
        data.signatureUrl !== undefined
      ) {
        const profileSet: Record<string, unknown> = { updatedAt: now };
        if (data.designation !== undefined)
          profileSet.designation = data.designation;
        if (data.specialization !== undefined)
          profileSet.specialization = data.specialization;
        if (data.signatureUrl !== undefined)
          profileSet.signatureUrl = data.signatureUrl;
        await tx
          .update(user_profiles)
          .set(profileSet)
          .where(eq(user_profiles.userId, id));
      }

      // Primary role assignment — only when the role actually changed.
      if (data.userRoleId && data.userRoleId !== current.userRoleId) {
        try {
          await tx
            .update(user_role_assignments)
            .set({ roleId: data.userRoleId, updatedAt: now })
            .where(
              and(
                eq(user_role_assignments.userId, id),
                eq(user_role_assignments.isPrimary, true),
              ),
            );
        } catch (err: any) {
          // The (userId, roleId, facilityId) unique index can collide if the
          // user already holds the target role as a secondary assignment. The
          // role link already exists in that case, so it's safe to ignore.
          if (err?.code !== "23505") throw err;
        }
      }

      return true;
    });

    // Re-read through the facility-scoped finder AFTER the transaction commits
    // (findById uses the global `db`, so it can't see in-flight tx writes).
    if (!didUpdate) return undefined;
    return this.findById(id);
  }

  /**
   * Admin password override: writes the new hash and revokes every active
   * auth session for the user so existing logins are forced to re-authenticate
   * with the new credential. Returns the number of sessions revoked.
   */
  public async resetPassword(id: string, passwordHash: string) {
    return db.transaction(async (tx) => {
      const now = new Date();

      await tx
        .update(users)
        .set({ passwordHash, updatedAt: now })
        .where(eq(users.id, id));

      const revoked = await tx
        .update(auth_sessions)
        .set({
          status: "revoked",
          revokedAt: now,
          revokedReason: "password_reset",
          updatedAt: now,
        })
        .where(
          and(
            eq(auth_sessions.userId, id),
            eq(auth_sessions.status, "active"),
          ),
        )
        .returning({ id: auth_sessions.id });

      return revoked.length;
    });
  }
}
