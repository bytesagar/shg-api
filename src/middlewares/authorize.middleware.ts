import { Response, NextFunction } from "express";
import { AppError } from "../utils/app-error";
import { HTTP_STATUS } from "../config/constants";
import { AuthRequest } from "./auth.middleware"; // Assuming AuthRequest is exported
import { normalizeRole } from "../constants/rbac";
import { hasPermission } from "./rbac.middleware";

export const authorize = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userRole = normalizeRole(req.user?.role);
    const normalizedAllowedRoles = allowedRoles
      .map((role) => normalizeRole(role))
      .filter((role): role is string => Boolean(role));

    if (!userRole || !normalizedAllowedRoles.includes(userRole)) {
      return next(
        new AppError(
          "Forbidden: You do not have permission to perform this action",
          HTTP_STATUS.FORBIDDEN,
        ),
      );
    }

    next();
  };
};

export const authorizePermission = (requiredPermission: string) => {
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
