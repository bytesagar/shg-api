import { Response } from "express";
import { BaseController } from "../../core/base.controller";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { AppError } from "../../utils/app-error";
import { catchAsync } from "../../utils/catch-async";
import { HTTP_STATUS } from "../../config/constants";
import { requireFacilityContext } from "../../utils/request-context";
import { AnalyticsService } from "./analytics.service";
import { isAnalyticsMethod } from "./analytics.methods";
import { geographyScopeParamsSchema } from "../../validations/analytics.validation";

export class AnalyticsController extends BaseController {
  public handle = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);

    const {
      method,
      facilityId,
      provinceId,
      districtId,
      municipalityId,
      ...rest
    } = req.query as Record<string, unknown>;

    if (!method || typeof method !== "string") {
      throw new AppError(
        "Query param 'method' is required",
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    if (!isAnalyticsMethod(method)) {
      throw new AppError(
        `Unknown analytics method '${method}'`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const facilityIdParam =
      typeof facilityId === "string" && facilityId.trim().length > 0
        ? facilityId.trim()
        : undefined;

    const geoParsed = geographyScopeParamsSchema.safeParse({
      provinceId,
      districtId,
      municipalityId,
    });
    if (!geoParsed.success) {
      const message = geoParsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      throw new AppError(
        `Validation failed: ${message}`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const service = new AnalyticsService(context);
    const scope = await service.resolveScope({
      facilityId: facilityIdParam,
      ...geoParsed.data,
    });
    const { result, range } = await service.run(method, scope, rest);

    return this.ok(
      res,
      {
        method,
        range: {
          from: toIsoDate(range.from),
          to: toIsoDate(range.to),
        },
        scope: scope.kind,
        facilityId: scope.kind === "facility" ? scope.facilityId : null,
        result,
      },
      "Analytics retrieved successfully",
    );
  });
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
