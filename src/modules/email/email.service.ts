import { Email, EmailProvider, NotificationResult } from "../../providers/types";
import { SendGridProvider } from "../../providers/sendgrid.provider";
import { LogProvider } from "../../providers/log.provider";

export class EmailService {
  private provider: EmailProvider;

  constructor() {
    if (process.env.NODE_ENV === "production" && process.env.SENDGRID_API_KEY) {
      this.provider = new SendGridProvider();
      console.log("📧 Using SendGrid for email services.");
    } else {
      this.provider = new LogProvider();
      console.log(
        "📧 Using LogProvider for email services. Emails will be printed to the console.",
      );
    }
  }

  async send(email: Email): Promise<NotificationResult> {
    return this.provider.send(email);
  }
}
