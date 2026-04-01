export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface Email {
  to: string;
  subject: string;
  body: string; // HTML body
}

export interface Sms {
  to: string;
  message: string;
}

export interface EmailProvider {
  send(email: Email): Promise<NotificationResult>;
}

export interface SmsProvider {
  send(sms: Sms): Promise<NotificationResult>;
}
