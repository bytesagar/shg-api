import { Response } from "express";
import { BaseController } from "../../core/base.controller";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { requireFacilityContext } from "../../utils/request-context";
import { catchAsync } from "../../utils/catch-async";
import { parseListQuery } from "../../utils/query-parser";
import { TestsService } from "./tests.service";
import { testsListQuerySchema } from "./tests.validation";

export class TestsController extends BaseController {
  public getTests = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const query = parseListQuery(req.query, testsListQuerySchema);

    const service = new TestsService(context);
    const result = await service.listTestsByPatientId({
      patientId: query.patientId,
      visitId: query.visitId,
      from: query.from,
      to: query.to,
      testCategory: query.testCategory,
      page: query.page,
      pageSize: query.pageSize,
    });

    return this.ok(res, result, "Tests retrieved successfully");
  });
}
