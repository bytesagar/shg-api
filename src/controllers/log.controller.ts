import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { LogService } from "../services/log.service";
import { catchAsync } from "../utils/catch-async";
import { logsListQuerySchema, parseListQuery } from "../utils/query-parser";

export class LogController extends BaseController {
  public getLogs = catchAsync(async (req: Request, res: Response) => {
    const query = parseListQuery(req.query, logsListQuerySchema);
    const result = await LogService.getLogs(query.page, query.pageSize);

    return this.ok(res, result, "Logs retrieved successfully");
  });
}
