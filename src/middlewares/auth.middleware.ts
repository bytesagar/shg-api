import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/app-error";
import { HTTP_STATUS } from "../config/constants";
import { FacilityContext } from "../context/facility-context";
import { verifyJwt } from "../utils/jwt";

// Extend Express Request type to include user payload
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    facilityId: string;
    userType: string;
  };
  context?: FacilityContext;
}

function isUserJwtPayload(payload: any): payload is AuthRequest["user"] {
  return (
    payload &&
    typeof payload === "object" &&
    typeof payload.id === "string" &&
    typeof payload.email === "string" &&
    typeof payload.role === "string" &&
    typeof payload.facilityId === "string"
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
    const decoded = verifyJwt(token);
    if (!isUserJwtPayload(decoded)) {
      return next(
        new AppError("Unauthorized: Invalid token", HTTP_STATUS.UNAUTHORIZED),
      );
    }

    if (!decoded.facilityId) {
      return next(
        new AppError(
          "Unauthorized: user is not associated with a facility",
          HTTP_STATUS.UNAUTHORIZED,
        ),
      );
    }

    req.user = decoded;
    req.context = {
      facilityId: decoded.facilityId,
      userId: decoded.id,
      role: decoded.role,
      userType: decoded.userType,
    };
    next();
  } catch (err) {
    return next(
      new AppError("Unauthorized: Invalid token", HTTP_STATUS.UNAUTHORIZED),
    );
  }
};
