import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { LogService } from "../services/log.service";
import { catchAsync } from "../utils/catch-async";

export class LogController extends BaseController {
  public getLogs = catchAsync(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await LogService.getLogs(page, limit);

    return this.ok(res, result, "Logs retrieved successfully");
  });
}
