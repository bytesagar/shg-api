import { Response } from "express";
import { BaseController } from "./base.controller";
import { catchAsync } from "../utils/catch-async";
import { AuthRequest } from "../middlewares/auth.middleware";
import {
  parseListQuery,
  icd11CodesListQuerySchema,
} from "../utils/query-parser";
import { Icd11CodeService } from "../services/icd11-code.service";

export class Icd11CodeController extends BaseController {
  constructor() {
    super();
  }

  public listIcd11Codes = catchAsync(async (req: AuthRequest, res: Response) => {
    const query = parseListQuery(req.query, icd11CodesListQuerySchema);
    const service = new Icd11CodeService();
    const result = await service.list(query);
    return this.ok(res, result, "ICD-11 codes retrieved successfully");
  });
}
