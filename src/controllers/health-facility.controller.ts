import { Response } from "express";
import { BaseController } from "./base.controller";
import { catchAsync } from "../utils/catch-async";
import { AppError } from "../utils/app-error";
import { HTTP_STATUS } from "../config/constants";
import { HealthFacilityService } from "../services/health-facility.service";
import { healthFacilityCreateSchema } from "../validations/health-facility.validation";
import { AuthRequest } from "../middlewares/auth.middleware";
import { requireFacilityContext } from "../utils/request-context";

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
      const page = Number.parseInt(String(req.query.page ?? "1"), 10) || 1;
      const pageSize =
        Number.parseInt(String(req.query.pageSize ?? "30"), 10) || 30;
      const searchString =
        typeof req.query.searchString === "string"
          ? req.query.searchString
          : undefined;
      const municipalityId =
        typeof req.query.municipalityId === "string"
          ? req.query.municipalityId
          : undefined;

      const context = requireFacilityContext(req);

      const healthFacilityService = new HealthFacilityService(context);
      const result = await healthFacilityService.getHealthFacilities({
        page,
        pageSize,
        searchString,
        municipalityId,
      });

      return this.ok(res, result, "Health facilities retrieved successfully");
    },
  );
}
