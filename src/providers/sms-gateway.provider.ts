import { Sms, SmsProvider, NotificationResult } from "./types";
import { logger } from "../utils/logger";

/**
 * Generic HTTP SMS gateway provider — STUB.
 *
 * This mirrors the v1 webapp's approach: POST a JSON body to a configurable
 * `SMS_HOST` URL. No specific vendor (Sparrow, Aakash, Twilio, …) is hardcoded;
 * the gateway is chosen entirely by the `SMS_HOST` you point it at.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WHEN A REAL PROVIDER IS CHOSEN, THIS FILE IS THE ONLY THING THAT CHANGES. │
 * │ Confirm three things against the vendor's API docs and edit `send()`:     │
 * │   1. Request URL / path                                                   │
 * │   2. Request body shape (currently { id, to, content } — the v1 shape)    │
 * │   3. Auth (currently optional Bearer token via SMS_API_TOKEN)             │
 * │ Everything else (factory selection, templates, logging, sms_logs audit,   │
 * │ phone normalization, call sites) stays untouched.                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
export class SmsGatewayProvider implements SmsProvider {
  private readonly host: string;
  private readonly token?: string;

  constructor() {
    const host = process.env.SMS_HOST;
    if (!host) {
      // Thrown so the SmsService factory falls back to the LogProvider.
      throw new Error("SMS_HOST is not set in environment variables.");
    }
    this.host = host;
    this.token = process.env.SMS_API_TOKEN || undefined;
  }

  async send(sms: Sms): Promise<NotificationResult> {
    const startedAt = Date.now();
    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": "application/json",
      };
      if (this.token) headers.Authorization = `Bearer ${this.token}`;

      const response = await fetch(this.host, {
        method: "POST",
        headers,
        // v1 gateway body shape. Adjust to the real vendor's contract.
        body: JSON.stringify({
          id: Date.now(),
          to: sms.to,
          content: sms.message,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        logger.error("sms.gateway.failed", {
          to: sms.to,
          status: response.status,
          body: text.slice(0, 500),
          durationMs: Date.now() - startedAt,
        });
        return {
          success: false,
          error: `SMS gateway responded ${response.status}`,
        };
      }

      const data: any = await response.json().catch(() => ({}));
      const messageId =
        data?.messageId ?? data?.id ?? data?.message_id ?? undefined;

      logger.info("sms.sent", {
        provider: "gateway",
        to: sms.to,
        messageId,
        durationMs: Date.now() - startedAt,
      });
      return { success: true, messageId };
    } catch (error: any) {
      logger.error("sms.gateway.failed", {
        to: sms.to,
        durationMs: Date.now() - startedAt,
        err: error,
        reason: error?.message,
      });
      return { success: false, error: error?.message ?? "SMS send failed" };
    }
  }
}
