import { Response, NextFunction } from "express";
import { AppError } from "../utils/app-error";
import { HTTP_STATUS } from "../config/constants";
import { AuthRequest } from "./auth.middleware"; // Assuming AuthRequest is exported

export const authorize = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
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
