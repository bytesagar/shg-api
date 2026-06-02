import { SmsProvider } from "../../providers/types";
import { LogProvider } from "../../providers/log.provider";
import { SmsGatewayProvider } from "../../providers/sms-gateway.provider";
import { FacilityContext } from "../../context/facility-context";
import { logger } from "../../utils/logger";
import { normalizeNepaliPhone } from "../../utils/phone";
import { SmsRepository } from "./sms.repository";
import {
  renderTemplate,
  SmsTemplateKey,
  SmsTemplateVars,
} from "./sms.templates";

/**
 * Provider is chosen once per process (mirrors NotificationService's realtime
 * getter and EmailService's selection): the real gateway in production when
 * SMS_HOST is set, otherwise the dev LogProvider that prints `[MOCK SMS SENT]`.
 */
let smsSingleton: SmsProvider | null = null;
let smsProviderName = "log";
function getSmsProvider(): SmsProvider {
  if (smsSingleton) return smsSingleton;
  if (process.env.NODE_ENV === "production" && process.env.SMS_HOST) {
    smsSingleton = new SmsGatewayProvider();
    smsProviderName = "gateway";
    logger.info("sms.provider.selected", { provider: "gateway" });
  } else {
    smsSingleton = new LogProvider();
    smsProviderName = "log";
    logger.info("sms.provider.selected", {
      provider: "log",
      reason: "non-prod or SMS_HOST_unset",
    });
  }
  return smsSingleton;
}

export interface SmsSendResult {
  /** True when nothing was dispatched (e.g. missing/invalid phone). */
  skipped: boolean;
  /** Provider success flag (undefined when skipped). */
  success?: boolean;
  reason?: string;
}

/**
 * Patient-facing SMS. Standalone (not part of the user-keyed NotificationService)
 * because recipients are phone numbers, not system users.
 *
 * Every method is **best-effort and never throws** — callers wire it into
 * business flows as a side effect that must not break the primary operation.
 */
export class SmsService {
  private readonly provider: SmsProvider;
  private readonly repo: SmsRepository;

  constructor(private readonly context: FacilityContext) {
    this.provider = getSmsProvider();
    this.repo = new SmsRepository(context);
  }

  /**
   * Send a free-text message. Normalizes the phone, writes a pending audit row,
   * dispatches via the selected provider, then records sent/failed.
   */
  async send(params: {
    to: string | null | undefined;
    message: string;
    patientId?: string | null;
    templateKey?: string | null;
  }): Promise<SmsSendResult> {
    const phone = normalizeNepaliPhone(params.to);
    if (!phone) {
      logger.warn("sms.skipped", {
        reason: "invalid_or_missing_phone",
        templateKey: params.templateKey ?? null,
      });
      return { skipped: true, reason: "invalid_or_missing_phone" };
    }

    let logId: string | null = null;
    try {
      logId = await this.repo.createPending({
        phone,
        body: params.message,
        patientId: params.patientId ?? null,
        templateKey: params.templateKey ?? null,
      });
    } catch (err) {
      // Don't let an audit-write failure block the send.
      logger.error("sms.log_create_failed", { err });
    }

    try {
      const result = await this.provider.send({
        to: phone,
        message: params.message,
      });
      if (logId) {
        if (result.success) {
          await this.repo.markSent(logId, result.messageId, smsProviderName);
        } else {
          await this.repo.markFailed(
            logId,
            result.error ?? "unknown error",
            smsProviderName,
          );
        }
      }
      return { skipped: false, success: result.success, reason: result.error };
    } catch (err: any) {
      logger.error("sms.send_failed", { err, reason: err?.message });
      if (logId) {
        await this.repo
          .markFailed(logId, err?.message ?? "send threw", smsProviderName)
          .catch(() => {});
      }
      return { skipped: false, success: false, reason: err?.message };
    }
  }

  /** Render a template by key and send it. */
  async sendTemplate(
    key: SmsTemplateKey,
    to: string | null | undefined,
    vars: SmsTemplateVars = {},
    opts: { patientId?: string | null } = {},
  ): Promise<SmsSendResult> {
    const message = renderTemplate(key, vars);
    return this.send({
      to,
      message,
      patientId: opts.patientId ?? null,
      templateKey: key,
    });
  }
}
