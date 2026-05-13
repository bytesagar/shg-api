import { Response } from "express";
import { BaseController } from "@/core/base.controller";
import { AuthRequest } from "@/middlewares/auth.middleware";
import { requireFacilityContext } from "@/utils/request-context";
import { catchAsync } from "@/utils/catch-async";
import { parseListQuery } from "@/utils/query-parser";
import { ImnciVisitService } from "./imnci-visit.service";
import {
  confirmTreatmentPlanSchema,
  createReferralSchema,
  saveAnswersSchema,
  startVisitSchema,
  visitsListQuerySchema,
} from "./imnci.validation";
import { AppError } from "@/utils/app-error";
import { HTTP_STATUS } from "@/config/constants";

function parseBody<T>(schema: { safeParse: (v: unknown) => any }, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const messages = result.error.issues
      .map((i: any) => `${i.path.join(".")}: ${i.message}`)
      .join(", ");
    throw new AppError(`Validation failed: ${messages}`, HTTP_STATUS.BAD_REQUEST);
  }
  return result.data;
}

export class ImnciVisitController extends BaseController {
  public startVisit = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const input = parseBody<ReturnType<typeof startVisitSchema.parse>>(
      startVisitSchema,
      req.body,
    );
    const service = new ImnciVisitService(context);
    const data = await service.startVisit(input);
    return this.created(res, data, "CB-IMNCI visit started");
  });

  public getVisit = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const service = new ImnciVisitService(context);
    const data = await service.getVisitDetail(req.params.id as string);
    return this.ok(res, data, "Visit retrieved");
  });

  public listVisits = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const query = parseListQuery(req.query, visitsListQuerySchema);
    const service = new ImnciVisitService(context);
    const data = await service.listVisits({
      page: query.page,
      pageSize: query.pageSize,
      patientId: query.patientId,
      status: query.status,
      from: query.from,
      to: query.to,
      classificationCode: query.classificationCode,
    });
    return this.ok(res, data, "Visits retrieved");
  });

  public saveAnswers = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const input = parseBody<ReturnType<typeof saveAnswersSchema.parse>>(
      saveAnswersSchema,
      req.body,
    );
    const service = new ImnciVisitService(context);
    const data = await service.saveAnswers(req.params.id as string, input);
    return this.ok(res, data, "Answers saved");
  });

  public classify = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const service = new ImnciVisitService(context);
    const data = await service.classifyVisit(req.params.id as string);
    return this.ok(res, data, "Classification complete");
  });

  public confirmPlan = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const input = parseBody<ReturnType<typeof confirmTreatmentPlanSchema.parse>>(
      confirmTreatmentPlanSchema,
      req.body,
    );
    const service = new ImnciVisitService(context);
    const data = await service.confirmTreatmentPlan(
      req.params.id as string,
      input,
    );
    return this.ok(res, data, "Treatment plan confirmed");
  });

  public refer = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const input = parseBody<ReturnType<typeof createReferralSchema.parse>>(
      createReferralSchema,
      req.body,
    );
    const service = new ImnciVisitService(context);
    const data = await service.refer(req.params.id as string, input);
    return this.created(res, data, "Referral created");
  });
}
