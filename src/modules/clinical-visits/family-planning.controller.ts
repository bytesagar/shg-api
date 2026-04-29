import { Response } from "express";
import { BaseController } from "../../core/base.controller";
import { catchAsync } from "../../utils/catch-async";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { requireFacilityContext } from "../../utils/request-context";
import {
  familyPlanningCreateSchema,
  familyPlanningsListQuerySchema,
} from "./family-planning.validation";
import { FamilyPlanningService } from "./family-planning.service";
import { parseListQuery } from "../../utils/query-parser";

export class FamilyPlanningController extends BaseController {
  public createFamilyPlanning = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);

      const validatedData = familyPlanningCreateSchema.safeParse(req.body);
      if (!validatedData.success) {
        const errorMessages = validatedData.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new AppError(
          `Validation failed: ${errorMessages}`,
          HTTP_STATUS.BAD_REQUEST,
        );
      }

      const service = new FamilyPlanningService(context);
      const result = await service.createFamilyPlanning(validatedData.data);

      if ("error" in result) {
        if (result.error === "PATIENT_NOT_FOUND") {
          throw new AppError("Patient not found", HTTP_STATUS.NOT_FOUND);
        }
        if (result.error === "VISIT_NOT_ACTIVE") {
          throw new AppError(
            "Cannot create family planning without an active visit",
            HTTP_STATUS.CONFLICT,
          );
        }
        throw new AppError(
          "Unable to create family planning",
          HTTP_STATUS.BAD_REQUEST,
        );
      }

      return this.created(res, result, "Family planning created successfully");
    },
  );

  public getFamilyPlanning = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const { id } = req.params as { id: string };

      const service = new FamilyPlanningService(context);
      const result = await service.getFamilyPlanningById(id);
      if (!result) {
        throw new AppError("Family planning not found", HTTP_STATUS.NOT_FOUND);
      }
      return this.ok(res, result, "Family planning retrieved successfully");
    },
  );

  public listFamilyPlannings = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const query = parseListQuery(
        req.query as Record<string, unknown>,
        familyPlanningsListQuerySchema,
      );

      const service = new FamilyPlanningService(context);
      const result = await service.listFamilyPlannings(query);
      return this.ok(
        res,
        {
          items: result.items,
          total: result.total,
          page: query.page,
          pageSize: query.pageSize,
        },
        "Family plannings retrieved successfully",
      );
    },
  );
}
