import { Response } from "express";
import { BaseController } from "../../core/base.controller";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { requireFacilityContext } from "../../utils/request-context";
import { catchAsync } from "../../utils/catch-async";
import { parseListQuery } from "../../utils/query-parser";
import { VitalsService } from "./vitals.service";
import { vitalsListQuerySchema } from "./vitals.validation";

export class VitalsController extends BaseController {
  public getVitals = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const query = parseListQuery(req.query, vitalsListQuerySchema);

    const service = new VitalsService(context);
    const result = await service.listVitalsByPatientId({
      patientId: query.patientId,
      page: query.page,
      pageSize: query.pageSize,
    });

    return this.ok(res, result, "Vitals retrieved successfully");
  });
}

