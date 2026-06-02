import { randomUUID } from "crypto";

import * as bcrypt from "bcryptjs";
import { eq, or, type SQL } from "drizzle-orm";

import { db } from "../../db";
import {
  persons,
  user_facility_affiliations,
  user_role_assignments,
  user_roles,
  users,
} from "../../db/schema";
import { normalizeNepaliPhone } from "../../utils/phone";
import type { MigrationContext, MigrationStep } from "../context";
import { v1Query } from "../v1-client";

/**
 * User roles + users.
 *
 * Roles: v2 is already seeded with the same role NAMES v1 uses (admin, doctor,
 * hfuser, fchvuser, palika — plus municipalityuser), so roles are *matched* by
 * name into the id-map, not inserted.
 *
 * Users: each v1 `User` becomes a v2 `persons` + `users` pair. Because the
 * running app derives a user's effective role from their *primary*
 * `user_role_assignments` row (falling back to `users.userType`), we also
 * create that assignment, plus a `user_facility_affiliations` row so doctors
 * pass the cross-facility check.
 *
 * Passwords are NOT migrated: v1 bcrypt hashes aren't assumed compatible and we
 * don't want to carry them. Every migrated user gets a fresh *unusable* bcrypt
 * hash (a hash of a random secret — `compare` always returns false but never
 * throws), so everyone must use the forgot-password flow on first login.
 */
interface V1User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  userType: string | null;
  phoneNumber: string;
  designation: string | null;
  facilityId: number | null;
  userRoleId: number | null;
  municipalityId: number | null;
  nmcRegistrationNumber: string | null;
  specialization: string | null;
  username: string | null;
  signatureURL: string | null;
  callStatus: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
  deletedBy: number | null;
}

/** Map a role name to the closest `userRoleEnum` value for `users.userType`. */
function roleToUserType(
  roleName: string | undefined,
): "admin" | "user" | "facility" | "doctor" | "fchv" {
  switch ((roleName ?? "").toLowerCase()) {
    case "admin":
      return "admin";
    case "doctor":
      return "doctor";
    case "hfuser":
      return "facility";
    case "fchvuser":
      return "fchv";
    default:
      return "user"; // palika, municipalityuser, empty/unknown
  }
}

export const usersStep: MigrationStep = {
  key: "users",
  title: "User roles + users (force password reset)",
  async run(ctx: MigrationContext): Promise<void> {
    const { idMap, report } = ctx;

    /**
     * Ensure an adopted (pre-existing) user has its primary role assignment and
     * facility affiliation, so a partial prior run is healed on re-run.
     */
    const ensureRoleAndAffiliation = async (
      userId: string,
      v2RoleId: string | undefined,
      facilityId: string | null,
    ) => {
      if (v2RoleId) {
        await db
          .insert(user_role_assignments)
          .values({ userId, roleId: v2RoleId, facilityId, isPrimary: true })
          .onConflictDoNothing();
      }
      if (facilityId) {
        await db
          .insert(user_facility_affiliations)
          .values({ userId, facilityId, roleId: v2RoleId ?? null, isActive: true })
          .onConflictDoNothing();
      }
    };

    // ---------- ROLES (match v1 UserRole -> v2 user_roles by name) ----------
    const v1Roles = await v1Query<{ id: number; name: string }>(
      `SELECT id, name FROM "UserRole" ORDER BY id`,
    );
    report.setV1Count("user_role", v1Roles.length);

    const v2Roles = await db
      .select({ id: user_roles.id, name: user_roles.name })
      .from(user_roles);
    const v2RoleByName = new Map<string, string>();
    for (const r of v2Roles) v2RoleByName.set(r.name.toLowerCase(), r.id);

    // v1 role-id -> role name (for per-user role resolution below)
    const v1RoleName = new Map<number, string>();
    for (const r of v1Roles) {
      v1RoleName.set(r.id, r.name);
      if (idMap.has("user_role", r.id)) {
        report.skipped("user_role");
        continue;
      }
      const v2Id = v2RoleByName.get(r.name.toLowerCase());
      if (!v2Id) {
        report.warn(`user_role "${r.name}" (v1 id ${r.id}) has no v2 match`);
        report.failed("user_role");
        continue;
      }
      await idMap.set("user_role", r.id, v2Id);
      report.inserted("user_role");
    }

    // ---------- USERS ----------
    const v1Users = await v1Query<V1User>(
      `SELECT id, email, "firstName", "lastName", "userType", "phoneNumber",
              designation, "facilityId", "userRoleId", "municipalityId",
              "nmcRegistrationNumber", specialization, username, "signatureURL",
              "callStatus", "createdAt", "updatedAt", "deletedAt", "deletedBy"
       FROM "User" ORDER BY id`,
    );
    report.setV1Count("user", v1Users.length);

    for (const u of v1Users) {
      if (idMap.has("user", u.id)) {
        report.skipped("user");
        continue;
      }

      const roleName = u.userRoleId != null ? v1RoleName.get(u.userRoleId) : undefined;
      const v2RoleId = idMap.get("user_role", u.userRoleId);
      const facilityId = idMap.get("facility", u.facilityId) ?? null;
      const municipalityId = idMap.get("municipality", u.municipalityId) ?? null;
      const phone =
        normalizeNepaliPhone(u.phoneNumber) ??
        (u.phoneNumber?.trim() || "+9779800000000");

      // Idempotency across crashes AND collision with pre-seeded users: if a
      // user with this email OR username already exists (both carry a UNIQUE
      // constraint — e.g. the seeded `admin`), adopt it instead of inserting a
      // duplicate.
      if (!ctx.dryRun) {
        const match: SQL[] = [eq(users.email, u.email)];
        if (u.username?.trim()) match.push(eq(users.username, u.username.trim()));
        const [pre] = await db
          .select({ id: users.id })
          .from(users)
          .where(match.length === 1 ? match[0] : or(...match))
          .limit(1);
        if (pre) {
          await idMap.set("user", u.id, pre.id);
          await ensureRoleAndAffiliation(pre.id, v2RoleId, facilityId);
          report.skipped("user");
          continue;
        }
      }

      const userType = roleToUserType(roleName ?? u.userType ?? undefined);

      if (ctx.dryRun) {
        await idMap.set("user", u.id, randomUUID());
        report.inserted("user");
        continue;
      }

      const v2UserId = await db.transaction(async (tx) => {
        const [person] = await tx
          .insert(persons)
          .values({
            status: u.deletedAt ? "inactive" : "active",
            createdAt: u.createdAt ?? new Date(),
            updatedAt: u.updatedAt ?? null,
            deletedAt: u.deletedAt ?? null,
          })
          .returning({ id: persons.id });

        const [user] = await tx
          .insert(users)
          .values({
            email: u.email,
            username: u.username ?? null,
            personId: person.id,
            firstName: u.firstName,
            lastName: u.lastName,
            passwordHash: bcrypt.hashSync(`!migrated!${randomUUID()}`, 10),
            accountStatus: u.deletedAt ? "inactive" : "active",
            userType,
            phoneNumber: phone,
            designation: u.designation ?? null,
            callStatus: u.callStatus ?? null,
            facilityId,
            municipalityId,
            userRoleId: v2RoleId ?? null,
            specialization: u.specialization ?? null,
            nmcRegistrationNumber: u.nmcRegistrationNumber ?? null,
            signatureUrl: u.signatureURL ?? null,
            createdAt: u.createdAt ?? new Date(),
            updatedAt: u.updatedAt ?? null,
            deletedAt: u.deletedAt ?? null,
          })
          .returning({ id: users.id });

        if (v2RoleId) {
          await tx
            .insert(user_role_assignments)
            .values({
              userId: user.id,
              roleId: v2RoleId,
              facilityId,
              municipalityId,
              isPrimary: true,
            })
            .onConflictDoNothing();
        }
        if (facilityId) {
          await tx
            .insert(user_facility_affiliations)
            .values({
              userId: user.id,
              facilityId,
              roleId: v2RoleId ?? null,
              isActive: !u.deletedAt,
            })
            .onConflictDoNothing();
        }
        return user.id;
      });

      await idMap.set("user", u.id, v2UserId);
      report.inserted("user");
    }
  },
};
