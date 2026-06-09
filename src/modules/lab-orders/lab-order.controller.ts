import { Response } from "express";
import { z } from "zod";

import { BaseController } from "@/core/base.controller";
import { AuthRequest } from "@/middlewares/auth.middleware";
import { catchAsync } from "@/utils/catch-async";
import { AppError } from "@/utils/app-error";
import { HTTP_STATUS } from "@/config/constants";
import { parseListQuery } from "@/utils/query-parser";
import { requireFacilityContext } from "@/utils/request-context";

import { LabOrderService } from "./lab-order.service";
import {
  collectSampleSchema,
  createLabOrderSchema,
  labOrdersListQuerySchema,
  recordResultSchema,
  uploadResultSchema,
} from "./lab-order.validation";

export class LabOrderController extends BaseController {
  public list = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const query = parseListQuery(req.query, labOrdersListQuerySchema);
    const data = await new LabOrderService(context).list(query);
    return this.ok(res, data, "Lab orders retrieved");
  });

  public stats = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const data = await new LabOrderService(context).stats();
    return this.ok(res, data, "Lab order stats retrieved");
  });

  public getById = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const data = await new LabOrderService(context).getById(
      req.params.id as string,
    );
    return this.ok(res, data, "Lab order retrieved");
  });

  public create = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const input = this.parse(createLabOrderSchema, req.body);
    const data = await new LabOrderService(context).create(input);
    return this.created(res, data, "Lab order created");
  });

  public collect = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const input = this.parse(collectSampleSchema, req.body);
    const data = await new LabOrderService(context).collect(
      req.params.id as string,
      input,
    );
    return this.ok(res, data, "Sample collection recorded");
  });

  public recordResult = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const input = this.parse(recordResultSchema, req.body);
    const data = await new LabOrderService(context).recordResult(
      req.params.id as string,
      input,
    );
    return this.ok(res, data, "Result recorded");
  });

  public uploadResult = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const input = this.parse(uploadResultSchema, req.body);
    const data = await new LabOrderService(context).uploadResult(
      req.params.id as string,
      input,
    );
    return this.ok(res, data, "Report uploaded");
  });

  private parse<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
    const result = schema.safeParse(body);
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      throw new AppError(
        `Validation failed: ${message}`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    return result.data;
  }
}
