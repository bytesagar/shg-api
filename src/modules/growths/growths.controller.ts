import { Response } from "express";
import { z } from "zod";
import { BaseController } from "../../core/base.controller";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { requireFacilityContext } from "../../utils/request-context";
import { catchAsync } from "../../utils/catch-async";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import { parseListQuery } from "../../utils/query-parser";
import { GrowthService } from "./growths.service";
import {
  growthCreateSchema,
  growthListQuerySchema,
  growthUpdateSchema,
} from "./growths.validation";

const idParamSchema = z.object({ id: z.uuid() }).strict();
const patientParamSchema = z.object({ patientId: z.uuid() }).strict();

function formatZodError(err: z.ZodError) {
  return err.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join(", ");
}

export class GrowthController extends BaseController {
  public list = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const query = parseListQuery(req.query, growthListQuerySchema);
    const service = new GrowthService(context);
    const result = await service.listByPatient({
      patientId: query.patientId,
      page: query.page,
      pageSize: query.pageSize,
    });
    return this.ok(res, result, "Growth records retrieved");
  });

  public create = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);

    const params = patientParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError("Invalid patientId", HTTP_STATUS.BAD_REQUEST);
    }
    const body = growthCreateSchema.safeParse(req.body);
    if (!body.success) {
      throw new AppError(
        `Validation failed: ${formatZodError(body.error)}`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const service = new GrowthService(context);
    const created = await service.createForPatient(
      params.data.patientId,
      body.data,
    );
    return this.created(res, created, "Growth record created");
  });

  public update = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);

    const params = idParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError("Invalid id", HTTP_STATUS.BAD_REQUEST);
    }
    const body = growthUpdateSchema.safeParse(req.body);
    if (!body.success) {
      throw new AppError(
        `Validation failed: ${formatZodError(body.error)}`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const service = new GrowthService(context);
    const updated = await service.update(params.data.id, body.data);
    return this.ok(res, updated, "Growth record updated");
  });
}
