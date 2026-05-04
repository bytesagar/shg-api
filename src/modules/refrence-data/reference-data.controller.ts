import { Response } from "express";
import { BaseController } from "../../core/base.controller";
import { catchAsync } from "../../utils/catch-async";
import { ReferenceDataService } from "./reference-data.service";
import {
  districtsQuerySchema,
  municipalitiesQuerySchema,
} from "./reference-data.validation";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";

export class ReferenceDataController extends BaseController {
  private readonly service = new ReferenceDataService();

  public listProvinces = catchAsync(async (_req, res: Response) => {
    const rows = await this.service.listProvinces();
    return this.ok(res, rows, "Provinces retrieved successfully");
  });

  public listDistricts = catchAsync(async (req, res: Response) => {
    const parsed = districtsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError("Invalid query", HTTP_STATUS.BAD_REQUEST);
    }
    const rows = await this.service.listDistricts(parsed.data);
    return this.ok(res, rows, "Districts retrieved successfully");
  });

  public listMunicipalities = catchAsync(async (req, res: Response) => {
    const parsed = municipalitiesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError("Invalid query", HTTP_STATUS.BAD_REQUEST);
    }
    const rows = await this.service.listMunicipalities(parsed.data);
    return this.ok(res, rows, "Municipalities retrieved successfully");
  });
}
