import { Response } from "express";
import { BaseController } from "../../core/base.controller";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { requireFacilityContext } from "../../utils/request-context";
import { catchAsync } from "../../utils/catch-async";
import { parseListQuery } from "../../utils/query-parser";
import { HistoriesService } from "./histories.service";
import { historiesListQuerySchema } from "./histories.validation";

export class HistoriesController extends BaseController {
  public getHistories = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const query = parseListQuery(req.query, historiesListQuerySchema);

    const service = new HistoriesService(context);
    const result = await service.listHistoriesByPatientId({
      patientId: query.patientId,
      visitId: query.visitId,
      from: query.from,
      to: query.to,
      page: query.page,
      pageSize: query.pageSize,
    });

    return this.ok(res, result, "Histories retrieved successfully");
  });
}
