import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import router from "./routes";
import { APP_CONFIG, HTTP_STATUS } from "./config/constants";
import { AppError } from "./utils/app-error";
import { swaggerSpec } from "./config/swagger";
import { loggerMiddleware } from "./middlewares/logger.middleware";
import { requestIdMiddleware } from "./middlewares/request-id.middleware";
import { logger } from "./utils/logger";
import { LogService } from "./modules/logs/log.service";

export const createApp = () => {
  const app = express();
  const corsOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:3001")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestIdMiddleware);
  app.use(loggerMiddleware);

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use(APP_CONFIG.API_PREFIX, router);

  app.use(async (err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof AppError) {
      logger.warn("http.app_error", {
        statusCode: err.statusCode,
        message: err.message,
        path: req.originalUrl,
        stack: err.stack,
      });
      await LogService.persist({
        level: "warn",
        message: err.message,
        meta: { stack: err.stack },
        req,
        statusCode: err.statusCode,
      });
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
    }

    logger.error("http.unhandled_error", {
      err,
      message: err?.message ?? "Internal Server Error",
      path: req.originalUrl,
    });
    await LogService.persist({
      level: "error",
      message: err?.message ?? "Internal Server Error",
      meta: { stack: err?.stack, name: err?.name },
      req,
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal Server Error",
    });
  });

  return app;
};
