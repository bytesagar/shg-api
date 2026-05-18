import sgMail from "@sendgrid/mail";
import { Email, EmailProvider, NotificationResult } from "./types";
import { logger } from "../utils/logger";

export class SendGridProvider implements EmailProvider {
  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error("SENDGRID_API_KEY is not set in environment variables.");
    }
    sgMail.setApiKey(apiKey);
  }

  async send(email: Email): Promise<NotificationResult> {
    const from = process.env.SENDGRID_FROM_EMAIL;
    if (!from) {
      logger.warn("email.sendgrid.misconfigured", {
        reason: "SENDGRID_FROM_EMAIL_unset",
      });
      return {
        success: false,
        error: "SENDGRID_FROM_EMAIL is not configured.",
      };
    }

    const startedAt = Date.now();
    try {
      const response = await sgMail.send({
        to: email.to,
        from,
        subject: email.subject,
        html: email.body,
      });
      const messageId = response[0]?.headers["x-message-id"];
      logger.info("email.sent", {
        provider: "sendgrid",
        to: email.to,
        subject: email.subject,
        messageId,
        durationMs: Date.now() - startedAt,
      });
      return { success: true, messageId };
    } catch (error: any) {
      const reason =
        error.response?.body?.errors?.[0]?.message ?? error.message;
      logger.error("email.sendgrid.failed", {
        to: email.to,
        subject: email.subject,
        durationMs: Date.now() - startedAt,
        err: error,
        reason,
      });
      return { success: false, error: reason };
    }
  }
}
