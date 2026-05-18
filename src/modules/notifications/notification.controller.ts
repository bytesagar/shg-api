import { Response } from "express";
import { z } from "zod";
import { BaseController } from "../../core/base.controller";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { requireFacilityContext } from "../../utils/request-context";
import { catchAsync } from "../../utils/catch-async";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import { parseListQuery } from "../../utils/query-parser";
import { NotificationService } from "./notification.service";
import { notificationListQuerySchema } from "../../validations/notification.validation";

const idParamSchema = z.object({ id: z.uuid() }).strict();

export class NotificationController extends BaseController {
  public list = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const query = parseListQuery(req.query, notificationListQuerySchema);
    const service = new NotificationService(context.userId);
    const result = await service.listForUser({
      userId: context.userId,
      page: query.page,
      pageSize: query.pageSize,
      unreadOnly: Boolean(query.unreadOnly),
    });
    return this.ok(res, result, "Notifications retrieved");
  });

  public markSeen = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) {
      throw new AppError("Invalid id", HTTP_STATUS.BAD_REQUEST);
    }
    const service = new NotificationService(context.userId);
    const updated = await service.markSeen(params.data.id, context.userId);
    if (!updated) {
      throw new AppError("Notification not found", HTTP_STATUS.NOT_FOUND);
    }
    return this.ok(res, updated, "Notification marked as seen");
  });

  public markAllSeen = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const service = new NotificationService(context.userId);
    await service.markAllSeen(context.userId);
    return this.noContent(res);
  });
}
