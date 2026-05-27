import { Response } from "express";

import { BaseController } from "@/core/base.controller";
import { AuthRequest } from "@/middlewares/auth.middleware";
import { requireFacilityContext } from "@/utils/request-context";
import { catchAsync } from "@/utils/catch-async";
import { parseListQuery } from "@/utils/query-parser";
import { AppError } from "@/utils/app-error";
import { HTTP_STATUS } from "@/config/constants";

import { ImnciRecordService } from "./imnci-record.service";
import {
  imnciRecordUpsertSchema,
  imnciRecordsListQuerySchema,
} from "./imnci-record.validation";

import type { ImnciRecordUpsertInput } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mirrors src/modules/imnci/imnci-visit.controller.ts; Zod 4's $ZodIssue shape doesn't unify with a structural Type<T>.
function parseBody<T>(schema: { safeParse: (v: unknown) => any }, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages = result.error.issues
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((i: any) => `${i.path.join(".")}: ${i.message}`)
      .join(", ");
    throw new AppError(
      `Validation failed: ${messages}`,
      HTTP_STATUS.BAD_REQUEST,
    );
  }
  return result.data;
}

export class ImnciRecordController extends BaseController {
  /**
   * Upsert by client-generated id. POST is intentionally idempotent so
   * the Dexie outbox can re-sync the same record after an edit without
   * duplicating rows.
   */
  public upsert = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const input = parseBody<ImnciRecordUpsertInput>(
      imnciRecordUpsertSchema,
      req.body,
    );
    const service = new ImnciRecordService(context);
    const data = await service.upsert(input);
    return this.created(res, data, "IMNCI record saved");
  });

  public list = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const query = parseListQuery(req.query, imnciRecordsListQuerySchema);
    const service = new ImnciRecordService(context);
    const data = await service.list(query);
    return this.ok(res, data, "IMNCI records retrieved");
  });

  public getById = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const service = new ImnciRecordService(context);
    const data = await service.getById(req.params.id as string);
    return this.ok(res, data, "IMNCI record retrieved");
  });

  public remove = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const service = new ImnciRecordService(context);
    await service.delete(req.params.id as string);
    return this.noContent(res);
  });
}
