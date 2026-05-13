import { Response } from "express";
import { BaseController } from "@/core/base.controller";
import { AuthRequest } from "@/middlewares/auth.middleware";
import { requireFacilityContext } from "@/utils/request-context";
import { catchAsync } from "@/utils/catch-async";
import { parseListQuery } from "@/utils/query-parser";
import { AppError } from "@/utils/app-error";
import { HTTP_STATUS } from "@/config/constants";
import { ImnciFchvService } from "./imnci-fchv.service";
import {
  fchvDispenseSchema,
  fchvScreeningCreateSchema,
  fchvScreeningsListQuerySchema,
} from "./imnci.validation";

function parse<T extends { safeParse: (v: unknown) => any }>(schema: T, body: unknown) {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new AppError(
      "Validation failed: " +
        result.error.issues
          .map((i: any) => `${i.path.join(".")}: ${i.message}`)
          .join(", "),
      HTTP_STATUS.BAD_REQUEST,
    );
  }
  return result.data;
}

export class ImnciFchvController extends BaseController {
  public createScreening = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const input = parse(fchvScreeningCreateSchema, req.body);
    const service = new ImnciFchvService(context);
    const data = await service.createScreening(input);
    return this.created(res, data, "FCHV screening recorded");
  });

  public dispense = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const input = parse(fchvDispenseSchema, req.body);
    const service = new ImnciFchvService(context);
    const data = await service.dispense(req.params.id as string, input);
    return this.created(res, data, "Commodity dispensed");
  });

  public listMine = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const query = parseListQuery(req.query, fchvScreeningsListQuerySchema);
    const service = new ImnciFchvService(context);
    const data = await service.listMyScreenings({
      page: query.page,
      pageSize: query.pageSize,
      from: query.from,
      to: query.to,
      referralRecommended: query.referralRecommended,
    });
    return this.ok(res, data, "Screenings retrieved");
  });
}
