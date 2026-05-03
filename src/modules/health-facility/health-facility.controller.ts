import { Response } from "express";
import { BaseController } from "../../core/base.controller";
import { catchAsync } from "../../utils/catch-async";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import { HealthFacilityService } from "./health-facility.service";
import {
  facilityDoctorAffiliationParamsSchema,
  facilityDoctorAffiliationUpsertBodySchema,
  healthFacilityCreateSchema,
} from "./health-facility.validation";
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

  public upsertDoctorAffiliation = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);

      const paramsParsed = facilityDoctorAffiliationParamsSchema.safeParse(
        req.params,
      );
      if (!paramsParsed.success) {
        throw new AppError("Invalid facilityId or doctorId", HTTP_STATUS.BAD_REQUEST);
      }

      const bodyParsed = facilityDoctorAffiliationUpsertBodySchema.safeParse(req.body);
      if (!bodyParsed.success) {
        const msg = bodyParsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join(", ");
        throw new AppError(msg, HTTP_STATUS.BAD_REQUEST);
      }

      const service = new HealthFacilityService(context);
      const row = await service.upsertDoctorAffiliation({
        facilityId: paramsParsed.data.facilityId,
        doctorId: paramsParsed.data.doctorId,
        roleId: bodyParsed.data.roleId,
      });

      return this.ok(res, row, "Doctor affiliation saved successfully");
    },
  );

  public deactivateDoctorAffiliation = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);

      const paramsParsed = facilityDoctorAffiliationParamsSchema.safeParse(
        req.params,
      );
      if (!paramsParsed.success) {
        throw new AppError("Invalid facilityId or doctorId", HTTP_STATUS.BAD_REQUEST);
      }

      const service = new HealthFacilityService(context);
      const row = await service.deactivateDoctorAffiliation({
        facilityId: paramsParsed.data.facilityId,
        doctorId: paramsParsed.data.doctorId,
      });
      if (!row) {
        throw new AppError("Affiliation not found", HTTP_STATUS.NOT_FOUND);
      }

      return this.ok(res, row, "Doctor affiliation deactivated successfully");
    },
  );
}
