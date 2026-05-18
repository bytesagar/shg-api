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

export interface RealtimeAuth {
  auth: string;
  channel_data?: string;
  shared_secret?: string;
}

export interface RealtimeProvider {
  trigger(channels: string[], event: string, data: any): Promise<void>;
  authorize(socketId: string, channel: string, userData?: any): RealtimeAuth;
}
