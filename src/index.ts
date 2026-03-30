import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { db } from "./db";
import router from "./routes";
import { APP_CONFIG, HTTP_STATUS } from "./config/constants";
import { AppError } from "./utils/app-error";
import { swaggerSpec } from "./config/swagger";
import { loggerMiddleware } from "./middlewares/logger.middleware";
import { LogService } from "./services/log.service";

const app = express();
const port = APP_CONFIG.PORT;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(loggerMiddleware);

// Swagger UI
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use(APP_CONFIG.API_PREFIX, router);

// Error Handling Middleware
app.use(async (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    await LogService.warn(err.message, { stack: err.stack }, req);
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Handle unexpected errors
  await LogService.error(err.message || "Internal Server Error", err, req);
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: "Internal Server Error",
  });
});

app.listen(port, () => {
  console.log(`🚀 Server started at http://localhost:${port}`);
});
