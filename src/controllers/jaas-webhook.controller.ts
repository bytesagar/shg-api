import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { catchAsync } from "../utils/catch-async";
import { AppError } from "../utils/app-error";
import { HTTP_STATUS } from "../config/constants";
import { JaasWebhookService } from "../services/jaas-webhook.service";

export class JaasWebhookController extends BaseController {
  private readonly service = new JaasWebhookService();

  /**
   * POST body: JaaS webhook JSON. Always returns 200 on success paths so JaaS does not retry
   * (except 4xx for auth / bad JSON per handler).
   */
  public handleWebhook = catchAsync(async (req: Request, res: Response) => {
    const parsed = this.service.parsePayload(req.body);
    if (!parsed.ok) {
      throw new AppError(
        `Invalid webhook payload: ${parsed.error}`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const result = await this.service.handleEvent(parsed.payload);

    if ("duplicate" in result && result.duplicate) {
      return this.ok(res, { duplicate: true }, "Duplicate webhook ignored");
    }

    if ("skipped" in result && result.skipped) {
      return this.ok(
        res,
        { skipped: true, reason: result.reason },
        "Webhook acknowledged",
      );
    }

    return this.ok(res, { applied: true }, "Session timing updated");
  });
}
