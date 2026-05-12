import { Response } from "express";
import { BaseController } from "../../core/base.controller";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { requireFacilityContext } from "../../utils/request-context";
import { catchAsync } from "../../utils/catch-async";
import { parseListQuery } from "../../utils/query-parser";
import { ComplaintsService } from "./complaints.service";
import { complaintsListQuerySchema } from "./complaints.validation";

export class ComplaintsController extends BaseController {
  public getComplaints = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const query = parseListQuery(req.query, complaintsListQuerySchema);

    const service = new ComplaintsService(context);
    const result = await service.listComplaintsByPatientId({
      patientId: query.patientId,
      visitId: query.visitId,
      from: query.from,
      to: query.to,
      page: query.page,
      pageSize: query.pageSize,
    });

    return this.ok(res, result, "Complaints retrieved successfully");
  });
}
