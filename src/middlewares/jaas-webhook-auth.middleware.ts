import { Request, Response, NextFunction } from "express";
import { HTTP_STATUS } from "../config/constants";

/**
 * Validates `Authorization` for JaaS webhooks (Developer Console optional header).
 * Accepts `Bearer <JITSI_WEBHOOK_SECRET>` or the raw secret as the full header value.
 */
export function jaasWebhookAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const secret = process.env.JITSI_WEBHOOK_SECRET;
  if (!secret || secret.length === 0) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: "Webhook not configured (JITSI_WEBHOOK_SECRET)",
    });
  }

  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: "Unauthorized: missing Authorization",
    });
  }

  const bearer = `Bearer ${secret}`;
  const ok = auth === bearer || auth === secret;

  if (!ok) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: "Unauthorized: invalid webhook credentials",
    });
  }

  next();
}
