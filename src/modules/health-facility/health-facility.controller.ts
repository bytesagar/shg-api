import { Response } from "express";
import { BaseController } from "../../core/base.controller";
import { catchAsync } from "../../utils/catch-async";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import { HealthFacilityService } from "./health-facility.service";
import { healthFacilityCreateSchema } from "./health-facility.validation";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { requireFacilityContext } from "../../utils/request-context";
import {
  healthFacilitiesListQuerySchema,
  parseListQuery,
} from "../../utils/query-parser";

export class HealthFacilityController extends BaseController {
  constructor() {
    super();
  }

  public createHealthFacility = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const validatedData = healthFacilityCreateSchema.safeParse(req.body);

      if (!validatedData.success) {
        const errorMessages = validatedData.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new AppError(
          `Validation failed: ${errorMessages}`,
          HTTP_STATUS.BAD_REQUEST,
        );
      }

      const context = requireFacilityContext(req);

      const healthFacilityService = new HealthFacilityService(context);
      const facility = await healthFacilityService.createHealthFacility(
        validatedData.data,
      );
      return this.created(
        res,
        facility,
        "Health facility created successfully",
      );
    },
  );

  public getHealthFacilities = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const query = parseListQuery(req.query, healthFacilitiesListQuerySchema);
      const context = requireFacilityContext(req);

      const healthFacilityService = new HealthFacilityService(context);
      const result = await healthFacilityService.getHealthFacilities(query);

      return this.ok(res, result, "Health facilities retrieved successfully");
    },
  );
}
