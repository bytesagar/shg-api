import pino, { Logger as PinoLogger, LoggerOptions } from "pino";
import { getCurrentRequestContext } from "./request-context";

type LogMeta = Record<string, unknown>;

const NODE_ENV = process.env.NODE_ENV ?? "development";
const IS_PROD = NODE_ENV === "production";
const IS_TEST = NODE_ENV === "test";

function resolveLevel(): string {
  const explicit = process.env.LOG_LEVEL?.trim().toLowerCase();
  if (explicit) return explicit;
  if (IS_TEST) return "silent";
  if (IS_PROD) return "info";
  return "debug";
}

const baseOptions: LoggerOptions = {
  level: resolveLevel(),
  base: { service: "shg-api", env: NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "passwordHash",
      "token",
      "jwt",
      "refreshToken",
      "*.password",
      "*.passwordHash",
      "*.token",
      "*.jwt",
      "*.refreshToken",
    ],
    censor: "[REDACTED]",
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
};

const transport =
  !IS_PROD && !IS_TEST
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:HH:MM:ss.l",
          ignore: "pid,hostname,service,env",
          singleLine: false,
        },
      }
    : undefined;

const basePino: PinoLogger = transport
  ? pino({ ...baseOptions, transport })
  : pino(baseOptions);

/**
 * Resolve the logger to use for a single call: a child carrying the current
 * request's ALS bindings, or the base logger when called outside a request
 * (cron, CLI, seed scripts).
 */
function effective(): PinoLogger {
  const ctx = getCurrentRequestContext();
  if (Object.keys(ctx).length === 0) return basePino;
  return basePino.child(ctx);
}

function mergeMeta(meta: LogMeta | undefined): LogMeta {
  if (!meta) return {};
  // Pino accepts Error objects natively; lift `err` if present.
  return meta;
}

/**
 * App logger. Always emits to stdout (JSON in prod, pretty in dev, silent in test).
 * `audit()` additionally persists the line to the `system_logs` table for
 * compliance/incident review without blocking the caller.
 */
export const logger = {
  trace(event: string, meta?: LogMeta) {
    effective().trace(mergeMeta(meta), event);
  },
  debug(event: string, meta?: LogMeta) {
    effective().debug(mergeMeta(meta), event);
  },
  info(event: string, meta?: LogMeta) {
    effective().info(mergeMeta(meta), event);
  },
  warn(event: string, meta?: LogMeta) {
    effective().warn(mergeMeta(meta), event);
  },
  error(event: string, meta?: LogMeta) {
    effective().error(mergeMeta(meta), event);
  },
  fatal(event: string, meta?: LogMeta) {
    effective().fatal(mergeMeta(meta), event);
  },
  /**
   * High-value events that must always reach the `system_logs` table
   * (security: login/lockout; clinical: appointment booked, recording attached).
   * Fire-and-forget DB persist — caller is not blocked on DB latency.
   */
  audit(event: string, meta?: LogMeta) {
    effective().info({ ...mergeMeta(meta), audit: true }, event);
    // Lazy-require to break a circular dep: LogService also imports logger.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { LogService } = require("../modules/logs/log.service");
    void LogService.persist({
      level: "info",
      message: event,
      meta: meta ?? null,
    }).catch((err: unknown) => {
      // Don't loop through logger.error → fall back to base pino directly.
      basePino.error({ err }, "log.audit.persist_failed");
    });
  },
  child(bindings: LogMeta): PinoLogger {
    return effective().child(bindings);
  },
};

/** Exposed only so process listeners can call pino directly without ALS lookup. */
export const baseLogger = basePino;
