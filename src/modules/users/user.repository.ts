import { db } from "../../db";
import {
  person_contacts,
  person_names,
  persons,
  user_profiles,
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
  or,
  sql,
} from "drizzle-orm";

export class UserRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, users.facilityId);
  }

  private userSelect = {
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
      const where =
        parts.length > 0
          ? this.withFacilityScope(
              and(eq(user_roles.name, params.role), ...parts),
            )
          : this.withFacilityScope(eq(user_roles.name, params.role));

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

    const where =
      parts.length > 0
        ? this.withFacilityScope(and(...parts))
        : this.withFacilityScope();
    const result = await db.select({ count: count() }).from(users).where(where);
    return Number(result[0]?.count ?? 0);
  }

  public async findAll(where?: SQL, opts?: { limit: number; offset: number }) {
    const base = db
      .select(this.userSelect)
      .from(users)
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
      const where =
        parts.length > 0
          ? this.withFacilityScope(
              and(eq(user_roles.name, params.role), ...parts),
            )
          : this.withFacilityScope(eq(user_roles.name, params.role));

      return db
        .select(this.userSelect)
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
        .limit(params.limit)
        .offset(params.offset);
    }

    const where =
      parts.length > 0
        ? this.withFacilityScope(and(...parts))
        : this.withFacilityScope();

    return db
      .select(this.userSelect)
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(params.limit)
      .offset(params.offset);
  }

  public async countAllByRole(role: string) {
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
      .where(this.withFacilityScope(eq(user_roles.name, role)));
    return Number(result[0]?.count ?? 0);
  }

  public async findAllByRole(
    role: string,
    opts: { limit: number; offset: number },
  ) {
    return db
      .select(this.userSelect)
      .from(users)
      .innerJoin(
        user_role_assignments,
        and(
          eq(user_role_assignments.userId, users.id),
          eq(user_role_assignments.isPrimary, true),
        ),
      )
      .innerJoin(user_roles, eq(user_roles.id, user_role_assignments.roleId))
      .where(this.withFacilityScope(eq(user_roles.name, role)))
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

  public async countAssignableForRoster() {
    return this.countAll(
      inArray(users.userType, UserRepository.rosterAssignableUserTypes),
    );
  }

  public async findAssignableForRoster(opts: {
    limit: number;
    offset: number;
  }) {
    return db
      .select(this.userSelect)
      .from(users)
      .where(
        this.withFacilityScope(
          inArray(users.userType, UserRepository.rosterAssignableUserTypes),
        ),
      )
      .orderBy(desc(users.createdAt))
      .limit(opts.limit)
      .offset(opts.offset);
  }

  public async findById(id: string) {
    const result = await db
      .select(this.userSelect)
      .from(users)
      .where(this.withFacilityScope(eq(users.id, id)))
      .limit(1);
    return result[0];
  }

  public async findByEmail(email: string) {
    const result = await db
      .select(this.userSelect)
      .from(users)
      .where(this.withFacilityScope(eq(users.email, email)))
      .limit(1);
    return result[0];
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
    userRoleId?: string | null;
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

      const insertedUsers = await tx
        .insert(users)
        .values({
          ...data,
          passwordHash: data.passwordHash,
          personId: person.id,
          facilityId: this.context.facilityId,
        })
        .returning(this.userSelect);
      const createdUser = insertedUsers[0];

      await tx.insert(user_profiles).values({
        userId: createdUser.id,
        designation: data.designation,
        specialization: data.specialization,
        signatureUrl: data.signatureUrl,
      });

      if (data.userRoleId) {
        await tx.insert(user_role_assignments).values({
          userId: createdUser.id,
          roleId: data.userRoleId,
          facilityId: this.context.facilityId,
          municipalityId: data.municipalityId ?? null,
          isPrimary: true,
        });
      }

      return createdUser;
    });
  }
}
