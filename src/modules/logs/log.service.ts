import { db } from "../../db";
import { system_logs } from "../../db/schema";
import { Request } from "express";
import { count, desc } from "drizzle-orm";

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogParams {
  level: LogLevel;
  message: string;
  meta?: any;
  req?: Request;
  statusCode?: number;
  duration?: number;
}

export class LogService {
  private static async saveLog(params: LogParams) {
    const { level, message, meta, req, statusCode, duration } = params;

    const logData: any = {
      level,
      message,
      meta,
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
      // Assume user id is stored in req.user after auth
      const userId = (req as any).user?.id;
      // Basic UUID validation to prevent DB errors
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (userId && typeof userId === "string" && uuidRegex.test(userId)) {
        logData.userId = userId;
      } else {
        logData.userId = null;
      }
    }

    try {
      await db.insert(system_logs).values(logData);
    } catch (err) {
      // Fallback to console if DB logging fails to avoid losing critical info
      console.error("❌ Failed to save log to database:", err);
    }

    // Also log to console for development visibility
    const consoleMethod =
      level === "error" ? "error" : level === "warn" ? "warn" : "log";
    console[consoleMethod](`[${level.toUpperCase()}] ${message}`, meta || "");
    if (meta && (meta as any).detail) {
      console.error("Postgres Detail:", (meta as any).detail);
    }
  }

  public static async info(message: string, meta?: any, req?: Request) {
    await this.saveLog({ level: "info", message, meta, req });
  }

  public static async warn(message: string, meta?: any, req?: Request) {
    await this.saveLog({ level: "warn", message, meta, req });
  }

  public static async error(message: string, meta?: any, req?: Request) {
    await this.saveLog({ level: "error", message, meta, req });
  }

  public static async debug(message: string, meta?: any, req?: Request) {
    await this.saveLog({ level: "debug", message, meta, req });
  }

  public static async http(
    req: Request,
    statusCode: number,
    duration: number,
    message: string = "HTTP Request",
  ) {
    await this.saveLog({
      level: statusCode >= 400 ? "warn" : "info",
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
