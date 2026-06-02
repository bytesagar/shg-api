/**
 * Integer status codes for the `sms_logs.status` column (preserved from the v1
 * schema where status was a 0/1 flag). Using named constants instead of magic
 * numbers at the call sites.
 */
export const SMS_STATUS = {
  PENDING: 0,
  SENT: 1,
  FAILED: 2,
} as const;

export type SmsStatus = (typeof SMS_STATUS)[keyof typeof SMS_STATUS];
