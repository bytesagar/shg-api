import { Response } from "express";
import { BaseController } from "../../core/base.controller";
import { catchAsync } from "../../utils/catch-async";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { requireFacilityContext } from "../../utils/request-context";
import { DashboardService } from "./dashboard.service";

export class DashboardController extends BaseController {
  public getSummary = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const service = new DashboardService(context);
    const summary = await service.getSummary();
    return this.ok(res, summary, "Dashboard summary retrieved successfully");
  });
}
