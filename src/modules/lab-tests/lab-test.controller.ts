import { Response } from "express";

import { BaseController } from "@/core/base.controller";
import { AuthRequest } from "@/middlewares/auth.middleware";
import { catchAsync } from "@/utils/catch-async";
import { parseListQuery } from "@/utils/query-parser";

import { LabTestService } from "./lab-test.service";
import { labTestsListQuerySchema } from "./lab-test.validation";

export class LabTestController extends BaseController {
    private readonly service = new LabTestService();

    public list = catchAsync(async (req: AuthRequest, res: Response) => {
        const query = parseListQuery(req.query, labTestsListQuerySchema);
        const data = await this.service.list(query);
        return this.ok(res, data, "Lab tests retrieved");
    });

    public getById = catchAsync(async (req: AuthRequest, res: Response) => {
        const data = await this.service.getById(req.params.id as string);
        return this.ok(res, data, "Lab test retrieved");
    });
}
