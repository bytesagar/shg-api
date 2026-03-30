import { Request, Response, NextFunction } from "express";
import { LogService } from "../services/log.service";

export const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on("finish", async () => {
    const duration = Date.now() - start;
    const { method, originalUrl } = req;
    const { statusCode } = res;

    // Exclude sensitive data from logs (like passwords)
    const body = { ...req.body };
    if (body.password) {
      body.password = "********";
    }

    const meta = {
      query: req.query,
      body: Object.keys(body).length > 0 ? body : undefined,
    };

    const message = `${method} ${originalUrl} ${statusCode} - ${duration}ms`;

    // Only log HTTP requests that aren't for the health check or swagger docs
    if (!originalUrl.includes("/health") && !originalUrl.includes("/docs")) {
      await LogService.http(req, statusCode, duration, message);
    }
  });

  next();
};
