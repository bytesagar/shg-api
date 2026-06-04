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

/**
 * Render an ISO instant as a human-readable local date-time for notification
 * copy. The deployment serves Nepal, so we format in Asia/Kathmandu (UTC+5:45)
 * rather than leaking a raw UTC `...Z` string into the inbox. Falls back to the
 * raw value if it isn't a parseable date.
 */
function formatScheduledAt(iso: unknown): string {
  if (typeof iso !== "string" || Number.isNaN(Date.parse(iso))) {
    return typeof iso === "string" ? iso : "the scheduled time";
  }
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export const NOTIFICATION_EVENTS = {
  "telehealth.appointment.booked": {
    persist: true,
    email: true,
    module: "telehealth",
    title: (d) =>
      d.patientName
        ? `Telehealth with ${d.patientName}`
        : "Telehealth appointment booked",
    description: (d) =>
      `Telehealth consult with ${d.patientName ?? "patient"} on ${formatScheduledAt(d.scheduledAt)}.`,
    channels: (_d, recipients) =>
      recipients.map((id) => `private-user-${id}`),
  },
  "telehealth.appointment.cancelled": {
    persist: true,
    email: false,
    module: "telehealth",
    title: (d) =>
      d.patientName
        ? `Cancelled: telehealth with ${d.patientName}`
        : "Telehealth appointment cancelled",
    description: (d) =>
      `Telehealth appointment on ${formatScheduledAt(d.scheduledAt)} was cancelled.`,
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
  "system.patient.registered": {
    persist: false,
    email: false,
    module: "system",
    title: (d) => `New patient registered: ${d.patientName ?? "Unknown"}`,
    description: (d) =>
      `${d.patientName ?? "A patient"} registered at ${d.facilityName ?? "a facility"} (${d.service ?? "general"})`,
    channels: () => ["private-admins-activity"],
  },
  "roster.shifts.added": {
    persist: true,
    email: true,
    module: "rosters",
    title: (d) =>
      (d.shifts?.length ?? 0) > 1
        ? "New shifts added to your roster"
        : "New shift added to your roster",
    description: (d) => {
      const shifts = d.shifts ?? [];
      if (shifts.length === 1) {
        const s = shifts[0];
        return `A new shift has been added to your roster: ${s.date} from ${s.fromTime} to ${s.toTime} (${s.service}).`;
      }
      const lines = shifts
        .map((s: any) => `- ${s.date} ${s.fromTime}-${s.toTime} (${s.service})`)
        .join("\n");
      return `${shifts.length} new shifts have been added to your roster:\n${lines}`;
    },
    channels: (_d, recipients) =>
      recipients.map((id) => `private-user-${id}`),
  },
} satisfies Record<string, EventConfig>;

export function getEventConfig(kind: NotificationEventKind): EventConfig {
  return NOTIFICATION_EVENTS[kind];
}
