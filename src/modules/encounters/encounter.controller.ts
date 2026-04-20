import { Response } from "express";
import { BaseController } from "../../core/base.controller";
import { catchAsync } from "../../utils/catch-async";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { requireFacilityContext } from "../../utils/request-context";
import { EncounterService } from "./encounter.service";

export class EncounterController extends BaseController {
  public getEncounters = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const service = new EncounterService(context);

    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 30);

    const visitId =
      typeof req.query.visitId === "string" ? req.query.visitId : undefined;
    const patientId =
      typeof req.query.patientId === "string" ? req.query.patientId : undefined;
    const doctorId =
      typeof req.query.doctorId === "string" ? req.query.doctorId : undefined;

    const items = await service.getEncounters({
      page: Number.isFinite(page) && page > 0 ? page : 1,
      pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 30,
      visitId,
      patientId,
      doctorId,
    });

    return this.ok(res, items, "Encounters retrieved successfully");
  });

  public getEncounter = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const service = new EncounterService(context);

    const encounter = await service.getEncounterById(req.params.id as string);
    return this.ok(res, encounter, "Encounter retrieved successfully");
  });
}
