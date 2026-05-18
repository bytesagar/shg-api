/**
 * Catalog of major events the API publishes. Each kind declares:
 *   - persist:  write a row to the `notifications` inbox table for each recipientUserId
 *   - email:    additionally email the recipient (uses primary email on the user record)
 *   - channels: build the list of realtime channels to trigger
 *   - title/description: rendered into the inbox row when persist=true
 *
 * Adding a new event = adding a new entry here + calling NotificationService.publish.
 */

export type NotificationEventKind = keyof typeof NOTIFICATION_EVENTS;

export interface NotificationEvent<K extends NotificationEventKind = NotificationEventKind> {
  kind: K;
  recipientUserIds: string[];
  data: Record<string, any>;
}

type EventConfig = {
  persist: boolean;
  email: boolean;
  module: string;
  title: (data: any) => string;
  description: (data: any) => string;
  channels: (data: any, recipientUserIds: string[]) => string[];
};

export const NOTIFICATION_EVENTS = {
  "telehealth.appointment.booked": {
    persist: true,
    email: true,
    module: "telehealth",
    title: () => "Telehealth appointment booked",
    description: (d) =>
      `Telehealth consult with ${d.patientName ?? "patient"} scheduled at ${d.scheduledAt}`,
    channels: (_d, recipients) =>
      recipients.map((id) => `private-user-${id}`),
  },
  "telehealth.appointment.cancelled": {
    persist: true,
    email: false,
    module: "telehealth",
    title: () => "Telehealth appointment cancelled",
    description: (d) =>
      `Telehealth appointment on ${d.scheduledAt} was cancelled`,
    channels: (_d, recipients) =>
      recipients.map((id) => `private-user-${id}`),
  },
  "telehealth.session.started": {
    persist: false,
    email: false,
    module: "telehealth",
    title: () => "Telehealth session started",
    description: () => "",
    channels: (d) => [`private-appointment-${d.appointmentId}`],
  },
  "telehealth.session.ended": {
    persist: true,
    email: false,
    module: "telehealth",
    title: () => "Telehealth session ended",
    description: (d) =>
      `Telehealth session ended (duration: ${d.durationSeconds ?? 0}s)`,
    channels: (d) => [`private-appointment-${d.appointmentId}`],
  },
  "auscultation.session.started": {
    persist: true,
    email: false,
    module: "tele-auscultation",
    title: () => "Tele-auscultation requested",
    description: (d) =>
      `Doctor ${d.doctorName ?? ""} has started a tele-auscultation session. Tap to share stethoscope audio.`,
    channels: (d, recipients) => [
      ...recipients.map((id) => `private-user-${id}`),
      `private-auscultation-${d.sessionId}`,
    ],
  },
  "auscultation.session.ended": {
    persist: true,
    email: false,
    module: "tele-auscultation",
    title: () => "Tele-auscultation ended",
    description: (d) =>
      `Tele-auscultation session ended (duration: ${d.durationSeconds ?? 0}s)`,
    channels: (d) => [`private-auscultation-${d.sessionId}`],
  },
  "auscultation.recording.ready": {
    persist: true,
    email: false,
    module: "tele-auscultation",
    title: () => "Auscultation recording ready",
    description: () => "An auscultation recording has been attached.",
    channels: (_d, recipients) =>
      recipients.map((id) => `private-user-${id}`),
  },
} satisfies Record<string, EventConfig>;

export function getEventConfig(kind: NotificationEventKind): EventConfig {
  return NOTIFICATION_EVENTS[kind];
}
