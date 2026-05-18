import { Email, EmailProvider, NotificationResult } from "../../providers/types";
import { SendGridProvider } from "../../providers/sendgrid.provider";
import { LogProvider } from "../../providers/log.provider";
import { logger } from "../../utils/logger";

export class EmailService {
  private provider: EmailProvider;

  constructor() {
    if (process.env.NODE_ENV === "production" && process.env.SENDGRID_API_KEY) {
      this.provider = new SendGridProvider();
      logger.info("email.provider.selected", { provider: "sendgrid" });
    } else {
      this.provider = new LogProvider();
      logger.info("email.provider.selected", {
        provider: "log",
        reason: "non-prod or SENDGRID_API_KEY_unset",
      });
    }
  }

  async send(email: Email): Promise<NotificationResult> {
    return this.provider.send(email);
  }
}
