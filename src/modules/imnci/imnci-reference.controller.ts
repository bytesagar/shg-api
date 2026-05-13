import { Response } from "express";
import { BaseController } from "@/core/base.controller";
import { AuthRequest } from "@/middlewares/auth.middleware";
import { requireFacilityContext } from "@/utils/request-context";
import { catchAsync } from "@/utils/catch-async";
import { ImnciChartBookletService } from "./imnci-chart-booklet.service";

export class ImnciReferenceController extends BaseController {
  public getActiveBooklet = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const service = new ImnciChartBookletService(context);
      const data = await service.getActiveBookletSummary();
      return this.ok(res, data, "Active CB-IMNCI booklet retrieved");
    },
  );

  public getBooklet = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const service = new ImnciChartBookletService(context);
    const { bundle, etag } = await service.getBookletBundle(
      req.params.id as string,
    );

    if (req.headers["if-none-match"] === etag) {
      res.status(304).end();
      return;
    }

    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", "private, max-age=300");
    return this.ok(res, bundle, "Booklet bundle retrieved");
  });

  public getFormulary = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const service = new ImnciChartBookletService(context);
    const { formulary, etag } = await service.getFormularyBundle(
      req.params.bookletId as string,
    );

    if (req.headers["if-none-match"] === etag) {
      res.status(304).end();
      return;
    }

    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", "private, max-age=300");
    return this.ok(res, formulary, "Formulary retrieved");
  });
}
