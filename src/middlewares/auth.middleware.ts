import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/app-error";
import { HTTP_STATUS } from "../config/constants";
import { FacilityContext } from "../context/facility-context";
import { verifyJwt } from "../utils/jwt";
import { getPermissionsForRole, normalizeRole } from "../constants/rbac";
import { db } from "../db";
import { user_facility_affiliations } from "../db/schema";
import { and, eq } from "drizzle-orm";

// Extend Express Request type to include user payload
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    facilityId: string;
    userType: string;
    sessionId?: string;
    patientId?: string;
    serviceArea?: {
      district: string;
      municipality?: string;
      ward?: number;
    };
    securityLabels?: Array<{ system: string; code: string; display: string }>;
    permissions: string[];
  };
  context?: FacilityContext;
}

interface UserJwtPayload {
  id: string;
  email: string;
  role: string;
  facilityId: string;
  userType: string;
  sessionId?: string;
  patientId?: string;
  serviceArea?: {
    district: string;
    municipality?: string;
    ward?: number;
  };
  securityLabels?: Array<{ system: string; code: string; display: string }>;
  permissions?: string[];
}

function isUserJwtPayload(payload: any): payload is UserJwtPayload {
  return (
    payload &&
    typeof payload === "object" &&
    typeof payload.id === "string" &&
    typeof payload.email === "string" &&
    typeof payload.role === "string" &&
    typeof payload.facilityId === "string" &&
    (payload.sessionId === undefined || typeof payload.sessionId === "string")
  );
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return next(
      new AppError("Unauthorized: No token provided", HTTP_STATUS.UNAUTHORIZED),
    );
  }

  try {
    const decodedRaw = verifyJwt(token);
    if (!isUserJwtPayload(decodedRaw)) {
      return next(
        new AppError("Unauthorized: Invalid token", HTTP_STATUS.UNAUTHORIZED),
      );
    }
    const decoded = decodedRaw as UserJwtPayload;

    if (!decoded.facilityId) {
      return next(
        new AppError(
          "Unauthorized: user is not associated with a facility",
          HTTP_STATUS.UNAUTHORIZED,
        ),
      );
    }

    const normalizedRole = normalizeRole(decoded.role) ?? decoded.role;

    const requestedFacilityIdRaw = req.headers["x-facility-id"];
    const requestedFacilityId =
      typeof requestedFacilityIdRaw === "string" &&
      requestedFacilityIdRaw.trim()
        ? requestedFacilityIdRaw.trim()
        : undefined;

    const resolveFacilityId = async (): Promise<string> => {
      if (!requestedFacilityId || requestedFacilityId === decoded.facilityId) {
        return decoded.facilityId;
      }

      if (normalizedRole === "admin") return requestedFacilityId;

      if (normalizedRole === "doctor") {
        const rows = await db
          .select({ id: user_facility_affiliations.id })
          .from(user_facility_affiliations)
          .where(
            and(
              eq(user_facility_affiliations.userId, decoded.id),
              eq(user_facility_affiliations.facilityId, requestedFacilityId),
              eq(user_facility_affiliations.isActive, true),
            ),
          )
          .limit(1);

        if (!rows[0]) {
          throw new AppError(
            "Forbidden: user is not affiliated with the requested facility",
            HTTP_STATUS.FORBIDDEN,
          );
        }
        return requestedFacilityId;
      }

      throw new AppError(
        "Forbidden: cross-facility access denied",
        HTTP_STATUS.FORBIDDEN,
      );
    };

    const setContext = async () => {
      const facilityId = await resolveFacilityId();
      req.user = {
        ...decoded,
        role: normalizedRole,
        permissions:
          decoded.permissions ?? getPermissionsForRole(normalizedRole),
      };
      req.context = {
        facilityId,
        userId: decoded.id,
        role: normalizedRole,
        userType: decoded.userType,
      };
      next();
    };

    setContext().catch(next);
  } catch (err) {
    return next(
      new AppError("Unauthorized: Invalid token", HTTP_STATUS.UNAUTHORIZED),
    );
  }
};
