import { Response } from "express";
import { z } from "zod";
import { BaseController } from "../../core/base.controller";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { requireFacilityContext } from "../../utils/request-context";
import { catchAsync } from "../../utils/catch-async";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import { ImmunizationService } from "./immunization.service";
import {
  childImmunizationUpsertSchema,
  immunizationHistoryCreateSchema,
} from "./immunizations.validation";

const uuidParamSchema = z.object({ patientId: z.string().uuid() }).strict();

export class ImmunizationController extends BaseController {
  public upsertChildImmunizationProfile = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);

      const paramsParsed = uuidParamSchema.safeParse(req.params);
      if (!paramsParsed.success) {
        throw new AppError("Invalid patientId", HTTP_STATUS.BAD_REQUEST);
      }

      const bodyParsed = childImmunizationUpsertSchema.safeParse(req.body);
      if (!bodyParsed.success) {
        const errorMessages = bodyParsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new AppError(
          `Validation failed: ${errorMessages}`,
          HTTP_STATUS.BAD_REQUEST,
        );
      }

      const service = new ImmunizationService(context);
      const profile = await service.upsertChildImmunizationProfile(
        paramsParsed.data.patientId,
        bodyParsed.data,
      );
      return this.ok(res, profile, "Child immunization profile saved");
    },
  );

  public createImmunizationHistory = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);

      const paramsParsed = uuidParamSchema.safeParse(req.params);
      if (!paramsParsed.success) {
        throw new AppError("Invalid patientId", HTTP_STATUS.BAD_REQUEST);
      }

      const bodyParsed = immunizationHistoryCreateSchema.safeParse(req.body);
      if (!bodyParsed.success) {
        const errorMessages = bodyParsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new AppError(
          `Validation failed: ${errorMessages}`,
          HTTP_STATUS.BAD_REQUEST,
        );
      }

      const service = new ImmunizationService(context);
      const created = await service.createImmunizationHistory(
        paramsParsed.data.patientId,
        bodyParsed.data,
      );
      return this.created(res, created, "Immunization record created");
    },
  );
}
