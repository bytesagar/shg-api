import { Response } from "express";
import { BaseController } from "../../core/base.controller";
import { catchAsync } from "../../utils/catch-async";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { requireFacilityContext } from "../../utils/request-context";
import { familyPlanningCreateSchema } from "./family-planning.validation";
import { FamilyPlanningService } from "./family-planning.service";

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
        throw new AppError(
          "Unable to create family planning",
          HTTP_STATUS.BAD_REQUEST,
        );
      }

      return this.created(res, result, "Family planning created successfully");
    },
  );
}
