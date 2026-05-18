import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { LogService } from "../modules/logs/log.service";

const SKIP_PATH_FRAGMENTS = ["/health", "/docs"];

function shouldSkip(originalUrl: string): boolean {
  return SKIP_PATH_FRAGMENTS.some((frag) => originalUrl.includes(frag));
}

/**
 * HTTP access log. Runs AFTER request-id middleware so every line carries
 * the requestId via AsyncLocalStorage. Persists only 4xx/5xx to `system_logs`
 * (the same threshold that existed before — keeps that table for triage).
 */
export const loggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const start = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const { method, originalUrl } = req;
    const { statusCode } = res;
    const skip = shouldSkip(originalUrl);

    const user = (req as any).user;
    const userId: string | undefined = user?.id;
    const facilityId: string | undefined = user?.facilityId;

    const meta = {
      method,
      path: originalUrl,
      statusCode,
      durationMs,
      userId,
      facilityId,
    };

    if (!skip) {
      if (statusCode >= 500) logger.error("http.request", meta);
      else if (statusCode >= 400) logger.warn("http.request", meta);
      else logger.info("http.request", meta);
    }

    if (!skip && statusCode >= 400) {
      void LogService.persist({
        level: statusCode >= 500 ? "error" : "warn",
        message: `${method} ${originalUrl} ${statusCode}`,
        meta: { durationMs, userId, facilityId },
        req,
        statusCode,
        duration: durationMs,
      }).catch(() => {
        // persist already logs its own failure via base pino
      });
    }
  });

  next();
};
