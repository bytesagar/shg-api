import { Response } from "express";
import { BaseController } from "../../core/base.controller";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { requireFacilityContext } from "../../utils/request-context";
import { catchAsync } from "../../utils/catch-async";
import { parseListQuery } from "../../utils/query-parser";
import { PhysicalExaminationsService } from "./physical-examinations.service";
import { physicalExaminationsListQuerySchema } from "./physical-examinations.validation";

export class PhysicalExaminationsController extends BaseController {
  public getPhysicalExaminations = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const query = parseListQuery(req.query, physicalExaminationsListQuerySchema);

      const service = new PhysicalExaminationsService(context);
      const result = await service.listPhysicalExaminationsByPatientId({
        patientId: query.patientId,
        visitId: query.visitId,
        from: query.from,
        to: query.to,
        page: query.page,
        pageSize: query.pageSize,
      });

      return this.ok(res, result, "Physical examinations retrieved successfully");
    },
  );
}
