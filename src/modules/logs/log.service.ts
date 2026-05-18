import { db } from "../../db";
import { system_logs } from "../../db/schema";
import { Request } from "express";
import { count, desc } from "drizzle-orm";
import { baseLogger, logger } from "../../utils/logger";

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogParams {
  level: LogLevel;
  message: string;
  meta?: any;
  req?: Request;
  statusCode?: number;
  duration?: number;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * LogService is the gateway to the `system_logs` table.
 *
 * Most application code should call `logger.*` directly (src/utils/logger).
 * LogService is kept for:
 *   1. Backwards compatibility: existing `LogService.info/warn/error` calls
 *      still work — they emit through the new logger and persist on warn/error.
 *   2. The `GET /api/v1/logs` admin endpoint, which reads from `system_logs`.
 *   3. `LogService.persist(...)` — the single DB-insert path used by
 *      `logger.audit(...)` and the HTTP access-log middleware.
 */
export class LogService {
  /** Insert one row into `system_logs`. Never throws — failures emit via base pino. */
  public static async persist(params: LogParams): Promise<void> {
    const { level, message, meta, req, statusCode, duration } = params;

    const logData: any = {
      level,
      message,
      meta: meta ?? null,
      statusCode,
      duration,
    };

    if (req) {
      const xForwardedFor = req.headers["x-forwarded-for"];
      logData.ipAddress =
        req.ip ||
        (Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor) ||
        null;
      logData.method = req.method;
      logData.path = req.originalUrl || req.url;
      const userId = (req as any).user?.id;
      logData.userId =
        typeof userId === "string" && UUID_RE.test(userId) ? userId : null;
    }

    try {
      await db.insert(system_logs).values(logData);
    } catch (err) {
      // Avoid recursion via logger.error → use base pino directly.
      baseLogger.error({ err, level, message }, "log.persist_failed");
    }
  }

  private static persistOnLevel(level: LogLevel): boolean {
    return level === "warn" || level === "error";
  }

  public static async info(message: string, meta?: any, req?: Request) {
    logger.info(message, meta);
    if (this.persistOnLevel("info")) {
      await this.persist({ level: "info", message, meta, req });
    }
  }

  public static async warn(message: string, meta?: any, req?: Request) {
    logger.warn(message, meta);
    await this.persist({ level: "warn", message, meta, req });
  }

  public static async error(message: string, meta?: any, req?: Request) {
    logger.error(message, meta);
    await this.persist({ level: "error", message, meta, req });
  }

  public static async debug(message: string, meta?: any, req?: Request) {
    logger.debug(message, meta);
    // debug never persists by default
    if (req) void req; // suppress unused
  }

  public static async http(
    req: Request,
    statusCode: number,
    duration: number,
    message: string = "HTTP Request",
  ) {
    const level: LogLevel = statusCode >= 500 ? "error" : "warn";
    await this.persist({
      level,
      message,
      req,
      statusCode,
      duration,
    });
  }

  public static async getLogs(page: number = 1, pageSize: number = 30) {
    const offset = (page - 1) * pageSize;
    const items = await db
      .select()
      .from(system_logs)
      .orderBy(desc(system_logs.createdAt))
      .limit(pageSize)
      .offset(offset);

    const totalResult = await db.select({ count: count() }).from(system_logs);
    const total = Number(totalResult[0]?.count ?? 0);

    return {
      items,
      total,
      page,
      pageSize,
    };
  }
}
