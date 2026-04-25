import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/app-error";
import { HTTP_STATUS } from "../config/constants";
import { FacilityContext } from "../context/facility-context";
import { verifyJwt } from "../utils/jwt";
import { getPermissionsForRole, normalizeRole } from "../constants/rbac";

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
    req.user = {
      ...decoded,
      role: normalizedRole,
      permissions: decoded.permissions ?? getPermissionsForRole(normalizedRole),
    };
    req.context = {
      facilityId: decoded.facilityId,
      userId: decoded.id,
      role: normalizedRole,
      userType: decoded.userType,
    };
    next();
  } catch (err) {
    return next(
      new AppError("Unauthorized: Invalid token", HTTP_STATUS.UNAUTHORIZED),
    );
  }
};
