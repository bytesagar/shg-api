import { Response } from "express";
import { BaseController } from "../../core/base.controller";
import { catchAsync } from "../../utils/catch-async";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { requireFacilityContext } from "../../utils/request-context";
import { AttachmentService } from "./attachment.service";
import {
  attachmentCreateSchema,
  attachmentGenerateUploadUrlSchema,
  attachmentListQuerySchema,
} from "./attachment.validation";

export class AttachmentController extends BaseController {
  public generateUploadUrl = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const parsed = attachmentGenerateUploadUrlSchema.safeParse(req.body);
      if (!parsed.success) {
        const msg = parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join(", ");
        throw new AppError(msg, HTTP_STATUS.BAD_REQUEST);
      }
      const service = new AttachmentService(context);
      const data = await service.generateUploadUrl(parsed.data);
      return this.ok(res, data, "Upload URL issued successfully");
    },
  );

  public createAttachment = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const parsed = attachmentCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        const msg = parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join(", ");
        throw new AppError(msg, HTTP_STATUS.BAD_REQUEST);
      }
      const service = new AttachmentService(context);
      const row = await service.confirmUpload(parsed.data);
      return this.created(res, row, "Attachment recorded successfully");
    },
  );

  public listAttachments = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const parsed = attachmentListQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        const msg = parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join(", ");
        throw new AppError(msg, HTTP_STATUS.BAD_REQUEST);
      }
      const service = new AttachmentService(context);
      const items = await service.listBySource(
        parsed.data.sourceType,
        parsed.data.sourceId,
        parsed.data.facilityId,
      );
      return this.ok(res, { items }, "Attachments retrieved successfully");
    },
  );

  public getDownloadUrl = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const { attachmentId } = req.params;
      const service = new AttachmentService(context);
      const data = await service.getDownloadUrl(attachmentId as string);
      return this.ok(res, data, "Download URL issued successfully");
    },
  );
}
