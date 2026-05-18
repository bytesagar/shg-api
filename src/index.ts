import * as dotenv from "dotenv";

const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";

dotenv.config({ path: envFile });

// Load logger AFTER dotenv so LOG_LEVEL etc. are visible.
import { createApp } from "./app";
import { APP_CONFIG } from "./config/constants";
import { logger, baseLogger } from "./utils/logger";
import { closeConnection } from "./db";

const app = createApp();
const port = APP_CONFIG.PORT;
const server = app.listen(port, () => {
  logger.info("server.started", { port });
});

let shuttingDown = false;
async function gracefulShutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("server.shutdown.start", { signal });

  const forceExit = setTimeout(() => {
    baseLogger.error({ reason: "timeout 10s" }, "server.shutdown.force_exit");
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close(async (err) => {
    if (err) {
      baseLogger.error({ err }, "server.shutdown.http_close_failed");
    }
    try {
      await closeConnection();
    } catch (dbErr) {
      baseLogger.error({ err: dbErr }, "server.shutdown.db_close_failed");
    }
    logger.info("server.shutdown.complete", { signal });
    clearTimeout(forceExit);
    process.exit(0);
  });
}

process.on("SIGTERM", () => void gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => void gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  baseLogger.error({ err: reason }, "process.unhandled_rejection");
});

process.on("uncaughtException", (err) => {
  baseLogger.fatal({ err }, "process.uncaught_exception");
  // Best practice: exit after uncaughtException — process state is unsafe.
  void gracefulShutdown("uncaughtException");
});
