import { Response } from "express";
import { BaseController } from "../../core/base.controller";
import { catchAsync } from "../../utils/catch-async";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { requireFacilityContext } from "../../utils/request-context";
import {
  HmisAnalyticsService,
  indicatorQuerySchema,
  monthlyAggregateQuerySchema,
  monthlyAggregateRecomputeSchema,
} from "./hmis-analytics.service";
import { isHmisIndicator } from "./hmis-analytics.types";

export class HmisAnalyticsController extends BaseController {
  public getIndicator = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const name = req.params.name as string;
      if (!isHmisIndicator(name)) {
        throw new AppError(
          `Unknown indicator: ${name}`,
          HTTP_STATUS.BAD_REQUEST,
        );
      }
      const parsed = indicatorQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        const errorMessages = parsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new AppError(
          `Validation failed: ${errorMessages}`,
          HTTP_STATUS.BAD_REQUEST,
        );
      }
      const service = new HmisAnalyticsService(context);
      const result = await service.getIndicator(name, parsed.data);
      return this.ok(res, result, `Indicator ${name} computed`);
    },
  );

  public listIndicators = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const service = new HmisAnalyticsService(context);
      return this.ok(
        res,
        service.listIndicatorNames(),
        "HMIS indicators listed",
      );
    },
  );

  public getMonthlyAggregate = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const parsed = monthlyAggregateQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        const errorMessages = parsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new AppError(
          `Validation failed: ${errorMessages}`,
          HTTP_STATUS.BAD_REQUEST,
        );
      }
      const service = new HmisAnalyticsService(context);
      const rows = await service.getMonthlyAggregate(
        parsed.data.year,
        parsed.data.month,
      );
      return this.ok(res, rows, "Aama monthly aggregate retrieved");
    },
  );

  public recomputeMonthlyAggregate = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const parsed = monthlyAggregateRecomputeSchema.safeParse(req.body);
      if (!parsed.success) {
        const errorMessages = parsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new AppError(
          `Validation failed: ${errorMessages}`,
          HTTP_STATUS.BAD_REQUEST,
        );
      }
      const service = new HmisAnalyticsService(context);
      const result = await service.recomputeMonthlyAggregate(
        parsed.data.year,
        parsed.data.month,
      );
      return this.ok(res, result, "Aama monthly aggregate recomputed");
    },
  );
}
