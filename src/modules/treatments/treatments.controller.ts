import { Response } from "express";
import { BaseController } from "../../core/base.controller";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { requireFacilityContext } from "../../utils/request-context";
import { catchAsync } from "../../utils/catch-async";
import { parseListQuery } from "../../utils/query-parser";
import { TreatmentsService } from "./treatments.service";
import { treatmentsListQuerySchema } from "./treatments.validation";

export class TreatmentsController extends BaseController {
  public getTreatments = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const query = parseListQuery(req.query, treatmentsListQuerySchema);

    const service = new TreatmentsService(context);
    const result = await service.listTreatmentsByPatientId({
      patientId: query.patientId,
      visitId: query.visitId,
      from: query.from,
      to: query.to,
      page: query.page,
      pageSize: query.pageSize,
    });

    return this.ok(res, result, "Treatments retrieved successfully");
  });
}
