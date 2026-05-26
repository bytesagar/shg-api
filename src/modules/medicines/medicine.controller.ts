import { Response } from "express";
import { ZodError } from "zod";
import { BaseController } from "../../core/base.controller";
import { catchAsync } from "../../utils/catch-async";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { requireFacilityContext } from "../../utils/request-context";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import { parseListQuery, medicinesListQuerySchema } from "../../utils/query-parser";
import {
  medicineCreateSchema,
  medicineUpdateSchema,
} from "../../validations/medicine.validation";
import { MedicineService } from "./medicine.service";

function zodMessage(error: ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join(", ");
}

export class MedicineController extends BaseController {
  private service = new MedicineService();

  public listMedicines = catchAsync(async (req: AuthRequest, res: Response) => {
    const query = parseListQuery(req.query, medicinesListQuerySchema);
    const result = await this.service.list(query);
    return this.ok(res, result, "Medicines retrieved successfully");
  });

  public getMedicine = catchAsync(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const medicine = await this.service.getById(id);
    return this.ok(res, medicine, "Medicine retrieved successfully");
  });

  public createMedicine = catchAsync(async (req: AuthRequest, res: Response) => {
    const { userId } = requireFacilityContext(req);
    const parsed = medicineCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(
        `Validation failed: ${zodMessage(parsed.error)}`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    const created = await this.service.create(parsed.data, userId);
    return this.created(res, created, "Medicine created successfully");
  });

  public updateMedicine = catchAsync(async (req: AuthRequest, res: Response) => {
    const { userId } = requireFacilityContext(req);
    const { id } = req.params as { id: string };
    const parsed = medicineUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(
        `Validation failed: ${zodMessage(parsed.error)}`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    const updated = await this.service.update(id, parsed.data, userId);
    return this.ok(res, updated, "Medicine updated successfully");
  });

  public deleteMedicine = catchAsync(async (req: AuthRequest, res: Response) => {
    const { userId } = requireFacilityContext(req);
    const { id } = req.params as { id: string };
    await this.service.delete(id, userId);
    return this.noContent(res);
  });
}
