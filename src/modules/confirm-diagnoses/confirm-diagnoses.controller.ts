import { Response } from "express";
import { BaseController } from "../../core/base.controller";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { requireFacilityContext } from "../../utils/request-context";
import { catchAsync } from "../../utils/catch-async";
import { parseListQuery } from "../../utils/query-parser";
import { ConfirmDiagnosesService } from "./confirm-diagnoses.service";
import { confirmDiagnosesListQuerySchema } from "./confirm-diagnoses.validation";

export class ConfirmDiagnosesController extends BaseController {
  public getConfirmDiagnoses = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const query = parseListQuery(req.query, confirmDiagnosesListQuerySchema);

      const service = new ConfirmDiagnosesService(context);
      const result = await service.listConfirmDiagnosesByPatientId({
        patientId: query.patientId,
        visitId: query.visitId,
        from: query.from,
        to: query.to,
        page: query.page,
        pageSize: query.pageSize,
      });

      return this.ok(res, result, "Confirm diagnoses retrieved successfully");
    },
  );
}
