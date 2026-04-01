import { Email, EmailProvider, NotificationResult, Sms, SmsProvider } from "./types";

export class LogProvider implements EmailProvider, SmsProvider {
  async send(notification: Email | Sms): Promise<NotificationResult> {
    if ("subject" in notification) {
      // It's an Email
      console.log(`
==================================================
[MOCK EMAIL SENT]
To: ${notification.to}
Subject: ${notification.subject}
Body:
${notification.body}
==================================================
      `);
    } else {
      // It's an SMS
      console.log(`
==================================================
[MOCK SMS SENT]
To: ${notification.to}
Message:
${notification.message}
==================================================
      `);
    }

    return {
      success: true,
      messageId: `mock-id-${Date.now()}`,
    };
  }
}
