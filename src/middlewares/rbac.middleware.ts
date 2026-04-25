import { NextFunction, Response } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { patients, users } from "../db/schema";
import { HTTP_STATUS } from "../config/constants";
import { AppError } from "../utils/app-error";
import { AuthRequest } from "./auth.middleware";

function permissionScopeWeight(scope: string): number {
  if (scope === "all") return 4;
  if (scope === "facility") return 3;
  if (scope === "ward") return 2;
  if (scope === "own") return 1;
  return 0;
}

function permissionCovers(granted: string, required: string): boolean {
  if (granted === required) return true;

  const grantedParts = granted.split(":");
  const requiredParts = required.split(":");
  if (grantedParts.length < 3 || requiredParts.length < 3) return false;
  if (grantedParts[0] !== requiredParts[0]) return false;
  if (grantedParts[1] !== requiredParts[1]) return false;

  const grantedScope = grantedParts[2];
  const requiredScope = requiredParts[2];
  return permissionScopeWeight(grantedScope) >= permissionScopeWeight(requiredScope);
}

export function hasPermission(
  userPermissions: string[] | undefined,
  requiredPermission: string,
): boolean {
  if (!userPermissions?.length) return false;
  return userPermissions.some((permission) =>
    permissionCovers(permission, requiredPermission),
  );
}

export const requirePermission = (requiredPermission: string) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!hasPermission(req.user?.permissions, requiredPermission)) {
      return next(
        new AppError(
          `Forbidden: Missing permission '${requiredPermission}'`,
          HTTP_STATUS.FORBIDDEN,
        ),
      );
    }
    next();
  };
};

export const requireAnyPermission = (requiredPermissions: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    const matched = requiredPermissions.some((permission) =>
      hasPermission(req.user?.permissions, permission),
    );
    if (!matched) {
      return next(
        new AppError(
          `Forbidden: Missing any of permissions [${requiredPermissions.join(", ")}]`,
          HTTP_STATUS.FORBIDDEN,
        ),
      );
    }
    next();
  };
};

export const requirePatientAccess = (options?: {
  patientIdParam?: string;
  readPermission?: string;
}) => {
  const patientIdParam = options?.patientIdParam ?? "patientId";
  const readPermission = options?.readPermission ?? "patient:read:own";

  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      const patientId = req.params[patientIdParam] ?? req.query[patientIdParam];
      if (!patientId || typeof patientId !== "string") {
        return next(
          new AppError(
            `Bad Request: missing '${patientIdParam}'`,
            HTTP_STATUS.BAD_REQUEST,
          ),
        );
      }

      if (hasPermission(req.user?.permissions, "patient:read:all")) {
        return next();
      }

      const patientRows = await db
        .select({ id: patients.id, facilityId: patients.facilityId })
        .from(patients)
        .where(eq(patients.id, patientId))
        .limit(1);

      const patient = patientRows[0];
      if (!patient) {
        return next(new AppError("Patient not found", HTTP_STATUS.NOT_FOUND));
      }

      if (
        hasPermission(req.user?.permissions, "patient:read:facility") &&
        patient.facilityId === req.user?.facilityId
      ) {
        return next();
      }

      if (
        hasPermission(req.user?.permissions, readPermission) &&
        req.user?.patientId &&
        req.user.patientId === patient.id
      ) {
        return next();
      }

      return next(
        new AppError(
          "Forbidden: You do not have access to this patient",
          HTTP_STATUS.FORBIDDEN,
        ),
      );
    } catch (error) {
      return next(error);
    }
  };
};

export const requireFacilityScopedUserAccess = (userIdParam = "id") => {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      if (!req.user?.facilityId) {
        return next(new AppError("Unauthorized", HTTP_STATUS.UNAUTHORIZED));
      }
      if (hasPermission(req.user?.permissions, "user:read:all")) {
        return next();
      }

      const targetUserId = req.params[userIdParam] ?? req.query[userIdParam];
      if (!targetUserId || typeof targetUserId !== "string") {
        return next();
      }

      const rows = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, targetUserId), eq(users.facilityId, req.user.facilityId)))
        .limit(1);

      if (!rows[0]) {
        return next(
          new AppError(
            "Forbidden: Cross-facility user access denied",
            HTTP_STATUS.FORBIDDEN,
          ),
        );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

