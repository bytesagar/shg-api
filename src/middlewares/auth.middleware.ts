import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { AppError } from "../utils/app-error";
import { HTTP_STATUS } from "../config/constants";

// Extend Express Request type to include user payload
export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
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
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "default_secret",
    ) as { id: string; email: string; role: string };
    req.user = decoded;
    next();
  } catch (err) {
    return next(
      new AppError("Unauthorized: Invalid token", HTTP_STATUS.UNAUTHORIZED),
    );
  }
};
