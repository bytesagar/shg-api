import { Response } from "express";
import { BaseController } from "../../core/base.controller";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { requireFacilityContext } from "../../utils/request-context";
import { catchAsync } from "../../utils/catch-async";
import { parseListQuery } from "../../utils/query-parser";
import { MedicationsService } from "./medications.service";
import { medicationsListQuerySchema } from "./medications.validation";

export class MedicationsController extends BaseController {
  public getMedications = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const query = parseListQuery(req.query, medicationsListQuerySchema);

    const service = new MedicationsService(context);
    const result = await service.listMedicationsByPatientId({
      patientId: query.patientId,
      visitId: query.visitId,
      from: query.from,
      to: query.to,
      page: query.page,
      pageSize: query.pageSize,
    });

    return this.ok(res, result, "Medications retrieved successfully");
  });
}
