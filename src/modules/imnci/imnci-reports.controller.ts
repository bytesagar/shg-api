import { Response } from "express";
import { BaseController } from "@/core/base.controller";
import { AuthRequest } from "@/middlewares/auth.middleware";
import { requireFacilityContext } from "@/utils/request-context";
import { catchAsync } from "@/utils/catch-async";
import { AppError } from "@/utils/app-error";
import { HTTP_STATUS } from "@/config/constants";
import { ImnciReportsService } from "./imnci-reports.service";
import { reportsQuerySchema } from "./imnci.validation";

function parseQuery(query: unknown) {
  const result = reportsQuerySchema.safeParse(query);
  if (!result.success) {
    throw new AppError(
      "Query validation failed: " +
        result.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join(", "),
      HTTP_STATUS.BAD_REQUEST,
    );
  }
  return result.data;
}

export class ImnciReportsController extends BaseController {
  public monthlyClassifications = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const q = parseQuery(req.query);
      const service = new ImnciReportsService(context);
      const data = await service.monthlyClassifications(q);
      return this.ok(res, data, "Monthly classifications retrieved");
    },
  );

  public visitsSummary = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const q = parseQuery(req.query);
      const service = new ImnciReportsService(context);
      const data = await service.visitsSummary(q);
      return this.ok(res, data, "Visits summary retrieved");
    },
  );

  public followUpsSummary = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const q = parseQuery(req.query);
      const service = new ImnciReportsService(context);
      const data = await service.followUpsSummary(q);
      return this.ok(res, data, "Follow-ups summary retrieved");
    },
  );

  public commoditiesDispensed = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const q = parseQuery(req.query);
      const service = new ImnciReportsService(context);
      const data = await service.commoditiesDispensed(q);
      return this.ok(res, data, "Commodities dispensed retrieved");
    },
  );
}
