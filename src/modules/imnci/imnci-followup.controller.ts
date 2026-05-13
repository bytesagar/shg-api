import { Response } from "express";
import { BaseController } from "@/core/base.controller";
import { AuthRequest } from "@/middlewares/auth.middleware";
import { requireFacilityContext } from "@/utils/request-context";
import { catchAsync } from "@/utils/catch-async";
import { parseListQuery } from "@/utils/query-parser";
import { AppError } from "@/utils/app-error";
import { HTTP_STATUS } from "@/config/constants";
import { ImnciFollowUpService } from "./imnci-followup.service";
import {
  completeFollowUpSchema,
  followUpsListQuerySchema,
} from "./imnci.validation";

export class ImnciFollowUpController extends BaseController {
  public list = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const query = parseListQuery(req.query, followUpsListQuerySchema);
    const service = new ImnciFollowUpService(context);
    const data = await service.list({
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
      from: query.from,
      to: query.to,
      patientId: query.patientId,
    });
    return this.ok(res, data, "Follow-ups retrieved");
  });

  public complete = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const parsed = completeFollowUpSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError(
        "Validation failed: " +
          parsed.error.issues.map((i) => i.message).join(", "),
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    const service = new ImnciFollowUpService(context);
    const data = await service.complete(
      req.params.id as string,
      parsed.data.completedVisitId,
    );
    return this.ok(res, data, "Follow-up completed");
  });
}
