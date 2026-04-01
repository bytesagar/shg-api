import sgMail from "@sendgrid/mail";
import { Email, EmailProvider, NotificationResult } from "./types";

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
      return {
        success: false,
        error: "SENDGRID_FROM_EMAIL is not configured.",
      };
    }

    try {
      const response = await sgMail.send({
        to: email.to,
        from,
        subject: email.subject,
        html: email.body,
      });

      return {
        success: true,
        messageId: response[0]?.headers["x-message-id"],
      };
    } catch (error: any) {
      console.error("SendGrid Error:", error.response?.body || error.message);
      return {
        success: false,
        error: error.response?.body?.errors[0]?.message || error.message,
      };
    }
  }
}
