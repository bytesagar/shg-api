import { Response } from "express";
import { z } from "zod";
import { BaseController } from "../../core/base.controller";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { requireFacilityContext } from "../../utils/request-context";
import { catchAsync } from "../../utils/catch-async";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import { parseListQuery } from "../../utils/query-parser";
import { AuscultationService } from "./auscultation.service";
import {
  auscultationJoinQuerySchema,
  auscultationListQuerySchema,
  auscultationRecordingSchema,
  auscultationStartSchema,
} from "../../validations/tele-auscultation.validation";

const idParamSchema = z.object({ id: z.uuid() }).strict();

function formatZodError(err: z.ZodError) {
  return err.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join(", ");
}

export class AuscultationController extends BaseController {
  public start = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const body = auscultationStartSchema.safeParse(req.body);
    if (!body.success) {
      throw new AppError(
        `Validation failed: ${formatZodError(body.error)}`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    const service = new AuscultationService(context);
    const result = await service.startSession(body.data);
    return this.created(res, result, "Auscultation session started");
  });

  public join = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError("Invalid id", HTTP_STATUS.BAD_REQUEST);
    }
    const query = auscultationJoinQuerySchema.safeParse(req.query);
    if (!query.success) {
      throw new AppError(
        "Query 'as' must be 'doctor' or 'patient'",
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    const service = new AuscultationService(context);
    const result = await service.getJoinLink({
      sessionId: params.data.id,
      as: query.data.as,
    });
    return this.ok(res, result, "Join link generated");
  });

  public stop = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError("Invalid id", HTTP_STATUS.BAD_REQUEST);
    }
    const service = new AuscultationService(context);
    const result = await service.stopSession(params.data.id);
    return this.ok(res, result, "Auscultation session ended");
  });

  public attachRecording = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const params = idParamSchema.safeParse(req.params);
      if (!params.success) {
        throw new AppError("Invalid id", HTTP_STATUS.BAD_REQUEST);
      }
      const body = auscultationRecordingSchema.safeParse(req.body);
      if (!body.success) {
        throw new AppError(
          `Validation failed: ${formatZodError(body.error)}`,
          HTTP_STATUS.BAD_REQUEST,
        );
      }
      const service = new AuscultationService(context);
      const result = await service.attachRecording(
        params.data.id,
        body.data.attachmentId,
      );
      return this.ok(res, result, "Recording attached");
    },
  );

  public getById = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError("Invalid id", HTTP_STATUS.BAD_REQUEST);
    }
    const service = new AuscultationService(context);
    const result = await service.getById(params.data.id);
    return this.ok(res, result, "Auscultation session retrieved");
  });

  public list = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const query = parseListQuery(req.query, auscultationListQuerySchema);
    const service = new AuscultationService(context);
    const result = await service.list(query);
    return this.ok(res, result, "Auscultation sessions retrieved");
  });
}
