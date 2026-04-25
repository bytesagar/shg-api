import { db } from "../../db";
import {
  audit_events,
  auth_sessions,
  user_role_assignments,
  user_roles,
  users,
} from "../../db/schema";
import { and, desc, eq } from "drizzle-orm";
import * as bcrypt from "bcryptjs";
import { signJwt } from "../../utils/jwt";
import { randomBytes, createHash } from "crypto";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";

type AuthUserPayload = Omit<typeof users.$inferSelect, "passwordHash">;

export class AuthService {
  private readonly accessTokenTtlMs = 24 * 60 * 60 * 1000;
  private readonly refreshTokenTtlMs = 7 * 24 * 60 * 60 * 1000;

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private async resolveRole(userId: string, fallbackRole: string) {
    const roleAssignment = await db
      .select({
        roleName: user_roles.name,
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
    return roleAssignment[0]?.roleName ?? fallbackRole;
  }

  private sanitizeUser(user: typeof users.$inferSelect): AuthUserPayload {
    const { passwordHash: _passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  public async getCurrentUser(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      throw new AppError("Unauthorized", HTTP_STATUS.UNAUTHORIZED);
    }
    return {
      user: this.sanitizeUser(user),
    };
  }

  public async login(email: string, password: string) {
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const foundUser = userResult[0];

    if (!foundUser) {
      throw new AppError("Invalid credentials", HTTP_STATUS.UNAUTHORIZED);
    }

    if (
      foundUser.accountStatus === "locked" &&
      foundUser.lockedUntil &&
      foundUser.lockedUntil > new Date()
    ) {
      throw new AppError(
        "Account is temporarily locked",
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    const isPasswordValid = await bcrypt.compare(password, foundUser.passwordHash);

    if (!isPasswordValid) {
      const attempts = (foundUser.failedLoginAttempts ?? 0) + 1;
      await db
        .update(users)
        .set({
          failedLoginAttempts: attempts,
          lockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
          accountStatus: attempts >= 5 ? "locked" : foundUser.accountStatus,
          updatedAt: new Date(),
        })
        .where(eq(users.id, foundUser.id));
      throw new AppError("Invalid credentials", HTTP_STATUS.UNAUTHORIZED);
    }

    if (!foundUser.facilityId) {
      throw new AppError(
        "User is not associated with a facility",
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    const resolvedRole = await this.resolveRole(foundUser.id, foundUser.userType);

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
        facilityId: foundUser.facilityId,
        sessionId,
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
      facilityId: foundUser.facilityId,
    });

    return {
      user: this.sanitizeUser(foundUser),
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

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);
    if (!user || !user.facilityId) {
      throw new AppError("Invalid session user", HTTP_STATUS.UNAUTHORIZED);
    }

    const resolvedRole = await this.resolveRole(user.id, user.userType);

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
        facilityId: user.facilityId,
        sessionId: session.id,
      },
      { expiresIn: `${Math.floor(this.accessTokenTtlMs / 1000)}s` },
    );

    await db.insert(audit_events).values({
      actorUserId: user.id,
      actorPersonId: user.personId,
      action: "session.refresh",
      resourceType: "AuthSession",
      resourceId: session.id,
      outcome: "success",
      facilityId: user.facilityId,
    });

    return {
      user: this.sanitizeUser(user),
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
