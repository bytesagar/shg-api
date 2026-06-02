import { db } from "../../db";
import {
  audit_events,
  auth_sessions,
  health_facilities,
  user_facility_affiliations,
  user_role_assignments,
  user_roles,
  users,
} from "../../db/schema";
import { and, desc, eq, isNotNull, or } from "drizzle-orm";
import * as bcrypt from "bcryptjs";
import { signJwt } from "../../utils/jwt";
import { randomBytes, createHash } from "crypto";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import { effectivePermissions, normalizeRole } from "../../constants/rbac";
import { logger } from "../../utils/logger";

type AuthUserPayload = Omit<typeof users.$inferSelect, "passwordHash">;

export class AuthService {
  private readonly accessTokenTtlMs = 24 * 60 * 60 * 1000;
  private readonly refreshTokenTtlMs = 7 * 24 * 60 * 60 * 1000;

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private async resolveRole(
    userId: string,
    fallbackRole: string,
  ): Promise<{ name: string; permissions: string[] }> {
    const roleAssignment = await db
      .select({
        roleName: user_roles.name,
        permissions: user_roles.permissions,
      })
      .from(user_role_assignments)
      .innerJoin(user_roles, eq(user_role_assignments.roleId, user_roles.id))
      .where(
        and(
          eq(user_role_assignments.userId, userId),
          eq(user_role_assignments.isPrimary, true),
        ),
      )
      .orderBy(desc(user_role_assignments.createdAt))
      .limit(1);
    const found = roleAssignment[0];
    return {
      name: found?.roleName ?? fallbackRole,
      permissions: found?.permissions ?? [],
    };
  }

  private sanitizeUser(user: typeof users.$inferSelect): AuthUserPayload {
    const { passwordHash: _passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  private readonly facilitySelect = {
    id: health_facilities.id,
    name: health_facilities.name,
    address: health_facilities.address,
    phone: health_facilities.phone,
    email: health_facilities.email,
    ward: health_facilities.ward,
    palika: health_facilities.palika,
    district: health_facilities.district,
    province: health_facilities.province,
  };

  /**
   * The facility a user lands in by default. Most users carry a `facilityId`
   * pin, but doctors are cross-facility and have none — for them we fall back
   * to their oldest active facility affiliation as the effective "home".
   * Returns null only when the user has neither a pin nor any affiliation.
   */
  private async resolveEffectiveFacilityId(
    userId: string,
    ownFacilityId: string | null,
  ): Promise<string | null> {
    if (ownFacilityId) return ownFacilityId;
    const [aff] = await db
      .select({ facilityId: user_facility_affiliations.facilityId })
      .from(user_facility_affiliations)
      .where(
        and(
          eq(user_facility_affiliations.userId, userId),
          eq(user_facility_affiliations.isActive, true),
        ),
      )
      .orderBy(user_facility_affiliations.createdAt)
      .limit(1);
    return aff?.facilityId ?? null;
  }

  private async fetchFacility(facilityId: string | null) {
    if (!facilityId) return null;
    const [f] = await db
      .select(this.facilitySelect)
      .from(health_facilities)
      .where(eq(health_facilities.id, facilityId))
      .limit(1);
    return f ?? null;
  }

  public async getCurrentUser(userId: string) {
    const userResult = await db
      .select({
        user: users,
        facility: {
          id: health_facilities.id,
          name: health_facilities.name,
          address: health_facilities.address,
          phone: health_facilities.phone,
          email: health_facilities.email,
          ward: health_facilities.ward,
          palika: health_facilities.palika,
          district: health_facilities.district,
          province: health_facilities.province,
        },
      })
      .from(users)
      .leftJoin(health_facilities, eq(health_facilities.id, users.facilityId))
      .where(eq(users.id, userId))
      .limit(1);

    const user = userResult[0]?.user;
    let facility = userResult[0]?.facility?.id ? userResult[0].facility : null;

    if (!user) {
      throw new AppError("Unauthorized", HTTP_STATUS.UNAUTHORIZED);
    }

    // Doctors carry no facility pin; surface their effective (affiliation)
    // facility so the client still has a facility to render/select.
    if (!facility) {
      const effectiveFacilityId = await this.resolveEffectiveFacilityId(
        user.id,
        user.facilityId,
      );
      facility = await this.fetchFacility(effectiveFacilityId);
    }

    const resolved = await this.resolveRole(user.id, user.userType);
    const role = normalizeRole(resolved.name);

    return {
      user: {
        ...this.sanitizeUser(user),
        facility,
      },
      role,
      permissions: effectivePermissions(role, resolved.permissions),
    };
  }

  public async listMyFacilities(userId: string) {
    const rows = await db
      .select({
        primaryFacilityId: users.facilityId,
        facilityId: health_facilities.id,
        name: health_facilities.name,
        address: health_facilities.address,
        phone: health_facilities.phone,
        email: health_facilities.email,
        ward: health_facilities.ward,
        palika: health_facilities.palika,
        district: health_facilities.district,
        province: health_facilities.province,
        roleId: user_facility_affiliations.roleId,
      })
      .from(health_facilities)
      .innerJoin(users, eq(users.id, userId))
      .leftJoin(
        user_facility_affiliations,
        and(
          eq(user_facility_affiliations.userId, userId),
          eq(user_facility_affiliations.facilityId, health_facilities.id),
          eq(user_facility_affiliations.isActive, true),
        ),
      )
      .where(
        or(
          eq(health_facilities.id, users.facilityId),
          isNotNull(user_facility_affiliations.id),
        ),
      );

    if (rows.length === 0) {
      throw new AppError("Unauthorized", HTTP_STATUS.UNAUTHORIZED);
    }

    // Most users have a `facilityId` pin that marks their primary facility.
    // Doctors don't, so fall back to their first affiliated facility as the
    // primary one (the list still contains every facility they can access).
    const primaryFacilityId =
      rows[0]?.primaryFacilityId ??
      rows.find((r) => r.facilityId)?.facilityId ??
      null;
    if (!primaryFacilityId) {
      throw new AppError("Unauthorized", HTTP_STATUS.UNAUTHORIZED);
    }

    return {
      items: rows.map((r) => ({
        facility: {
          id: r.facilityId,
          name: r.name,
          address: r.address,
          phone: r.phone,
          email: r.email,
          ward: r.ward,
          palika: r.palika,
          district: r.district,
          province: r.province,
        },
        isPrimary: r.facilityId === primaryFacilityId,
        roleId: r.roleId ?? null,
      })),
    };
  }

  public async login(email: string, password: string) {
    const userResult = await db
      .select({
        user: users,
        facility: {
          id: health_facilities.id,
          name: health_facilities.name,
          address: health_facilities.address,
          phone: health_facilities.phone,
          email: health_facilities.email,
          ward: health_facilities.ward,
          palika: health_facilities.palika,
          district: health_facilities.district,
          province: health_facilities.province,
        },
      })
      .from(users)
      .leftJoin(health_facilities, eq(health_facilities.id, users.facilityId))
      .where(eq(users.email, email))
      .limit(1);

    const foundUser = userResult[0]?.user;
    let facility = userResult[0]?.facility?.id ? userResult[0].facility : null;

    if (!foundUser) {
      logger.audit("auth.login.failed", { email, reason: "unknown_email" });
      throw new AppError("Invalid credentials", HTTP_STATUS.UNAUTHORIZED);
    }

    if (
      foundUser.accountStatus === "locked" &&
      foundUser.lockedUntil &&
      foundUser.lockedUntil > new Date()
    ) {
      logger.audit("auth.login.failed", {
        userId: foundUser.id,
        email,
        reason: "account_locked",
        lockedUntil: foundUser.lockedUntil.toISOString(),
      });
      throw new AppError(
        "Account is temporarily locked",
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    const isPasswordValid = await bcrypt.compare(password, foundUser.passwordHash);

    if (!isPasswordValid) {
      const attempts = (foundUser.failedLoginAttempts ?? 0) + 1;
      const willLock = attempts >= 5;
      await db
        .update(users)
        .set({
          failedLoginAttempts: attempts,
          lockedUntil: willLock ? new Date(Date.now() + 15 * 60 * 1000) : null,
          accountStatus: willLock ? "locked" : foundUser.accountStatus,
          updatedAt: new Date(),
        })
        .where(eq(users.id, foundUser.id));
      logger.audit("auth.login.failed", {
        userId: foundUser.id,
        email,
        reason: "bad_password",
        attempts,
      });
      if (willLock) {
        logger.audit("auth.account.locked", {
          userId: foundUser.id,
          attempts,
        });
      }
      throw new AppError("Invalid credentials", HTTP_STATUS.UNAUTHORIZED);
    }

    const effectiveFacilityId = await this.resolveEffectiveFacilityId(
      foundUser.id,
      foundUser.facilityId,
    );
    if (!effectiveFacilityId) {
      throw new AppError(
        "User is not associated with a facility",
        HTTP_STATUS.UNAUTHORIZED,
      );
    }
    // Doctors carry no facility pin, so the join above yielded no facility —
    // hydrate it from the effective (affiliation) facility for the response.
    if (!facility) {
      facility = await this.fetchFacility(effectiveFacilityId);
    }

    const resolved = await this.resolveRole(foundUser.id, foundUser.userType);
    const resolvedRole = resolved.name;
    const normalizedRole = normalizeRole(resolvedRole);
    const permissions = effectivePermissions(normalizedRole, resolved.permissions);

    const refreshToken = randomBytes(48).toString("hex");
    const refreshTokenHash = this.hashToken(refreshToken);
    const sessionInserted = await db
      .insert(auth_sessions)
      .values({
        userId: foundUser.id,
        refreshTokenHash,
        status: "active",
        expiresAt: new Date(Date.now() + this.refreshTokenTtlMs),
        issuedAt: new Date(),
        lastUsedAt: new Date(),
      })
      .returning({ id: auth_sessions.id });
    const sessionId = sessionInserted[0]?.id;

    const token = signJwt(
      {
        id: foundUser.id,
        email: foundUser.email,
        role: resolvedRole,
        userType: foundUser.userType,
        facilityId: effectiveFacilityId,
        sessionId,
        permissions,
      },
      { expiresIn: `${Math.floor(this.accessTokenTtlMs / 1000)}s` },
    );

    await db
      .update(users)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        accountStatus: "active",
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, foundUser.id));

    await db.insert(audit_events).values({
      actorUserId: foundUser.id,
      actorPersonId: foundUser.personId,
      action: "login.success",
      resourceType: "User",
      resourceId: foundUser.id,
      outcome: "success",
      facilityId: effectiveFacilityId,
    });

    logger.audit("auth.login.success", {
      userId: foundUser.id,
      email: foundUser.email,
      facilityId: effectiveFacilityId,
      sessionId,
    });

    return {
      user: this.sanitizeUser(foundUser),
      facility,
      role: normalizedRole,
      permissions,
      accessToken: token,
      expiresInSec: Math.floor(this.accessTokenTtlMs / 1000),
      refreshToken,
      sessionId,
    };
  }

  public async refresh(refreshToken: string) {
    const refreshTokenHash = this.hashToken(refreshToken);
    const [session] = await db
      .select()
      .from(auth_sessions)
      .where(eq(auth_sessions.refreshTokenHash, refreshTokenHash))
      .limit(1);
    if (!session) {
      throw new AppError("Invalid refresh token", HTTP_STATUS.UNAUTHORIZED);
    }
    if (session.status !== "active") {
      throw new AppError("Invalid refresh token", HTTP_STATUS.UNAUTHORIZED);
    }
    if (session.expiresAt < new Date()) {
      throw new AppError("Refresh session expired", HTTP_STATUS.UNAUTHORIZED);
    }

    const userRows = await db
      .select({
        user: users,
        facility: {
          id: health_facilities.id,
          name: health_facilities.name,
          address: health_facilities.address,
          phone: health_facilities.phone,
          email: health_facilities.email,
          ward: health_facilities.ward,
          palika: health_facilities.palika,
          district: health_facilities.district,
          province: health_facilities.province,
        },
      })
      .from(users)
      .leftJoin(health_facilities, eq(health_facilities.id, users.facilityId))
      .where(eq(users.id, session.userId))
      .limit(1);

    const user = userRows[0]?.user;
    let facility = userRows[0]?.facility?.id ? userRows[0].facility : null;

    if (!user) {
      throw new AppError("Invalid session user", HTTP_STATUS.UNAUTHORIZED);
    }

    const effectiveFacilityId = await this.resolveEffectiveFacilityId(
      user.id,
      user.facilityId,
    );
    if (!effectiveFacilityId) {
      throw new AppError("Invalid session user", HTTP_STATUS.UNAUTHORIZED);
    }
    if (!facility) {
      facility = await this.fetchFacility(effectiveFacilityId);
    }

    const resolved = await this.resolveRole(user.id, user.userType);
    const resolvedRole = resolved.name;
    const normalizedRole = normalizeRole(resolvedRole);
    const permissions = effectivePermissions(normalizedRole, resolved.permissions);

    const newRefreshToken = randomBytes(48).toString("hex");
    const newRefreshTokenHash = this.hashToken(newRefreshToken);
    await db
      .update(auth_sessions)
      .set({
        refreshTokenHash: newRefreshTokenHash,
        lastUsedAt: new Date(),
        expiresAt: new Date(Date.now() + this.refreshTokenTtlMs),
        updatedAt: new Date(),
      })
      .where(eq(auth_sessions.id, session.id));

    const accessToken = signJwt(
      {
        id: user.id,
        email: user.email,
        role: resolvedRole,
        userType: user.userType,
        facilityId: effectiveFacilityId,
        sessionId: session.id,
        permissions,
      },
      { expiresIn: `${Math.floor(this.accessTokenTtlMs / 1000)}s` },
    );

    logger.audit("auth.token.refreshed", {
      userId: user.id,
      sessionId: session.id,
    });

    await db.insert(audit_events).values({
      actorUserId: user.id,
      actorPersonId: user.personId,
      action: "session.refresh",
      resourceType: "AuthSession",
      resourceId: session.id,
      outcome: "success",
      facilityId: effectiveFacilityId,
    });

    return {
      user: this.sanitizeUser(user),
      facility,
      role: normalizedRole,
      permissions,
      accessToken,
      expiresInSec: Math.floor(this.accessTokenTtlMs / 1000),
      refreshToken: newRefreshToken,
      sessionId: session.id,
    };
  }

  public async logout(refreshToken: string) {
    const refreshTokenHash = this.hashToken(refreshToken);
    const [session] = await db
      .select()
      .from(auth_sessions)
      .where(eq(auth_sessions.refreshTokenHash, refreshTokenHash))
      .limit(1);
    if (!session) return;

    await db
      .update(auth_sessions)
      .set({
        status: "revoked",
        revokedAt: new Date(),
        revokedReason: "user_logout",
        updatedAt: new Date(),
      })
      .where(eq(auth_sessions.id, session.id));

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);
    if (user?.facilityId) {
      await db.insert(audit_events).values({
        actorUserId: user.id,
        actorPersonId: user.personId,
        action: "logout",
        resourceType: "AuthSession",
        resourceId: session.id,
        outcome: "success",
        facilityId: user.facilityId,
      });
    }
  }
}
