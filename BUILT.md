# What was built — Pusher notifications + Tele-Auscultation

## Scope

Two features delivered in one pass:

1. **Pusher-based notifications service** — a feature-agnostic fan-out that persists an inbox row, publishes a realtime event over Pusher Channels, and optionally emails the recipient. Wired into telehealth bookings and the client-driven session-end PATCH today; extensible to any future event (prescriptions, lab results, etc.) by adding one entry to the event catalog.

2. **Tele-Auscultation** — doctor opens an audio-only session; the server reuses the existing JaaS / Jitsi infrastructure to mint moderator + patient JWTs; the patient app receives a Pusher event whose payload auto-fills a "tele-auscultation link" field; the patient taps it and their device mic streams to the doctor over Jitsi. Recordings are attached to the session via the existing S3 presigned-upload flow.

A follow-up pass removed the JaaS webhook entirely — session start/end timing is now driven entirely by client-side Jitsi iframe events flowing back through the existing `PATCH /telehealth/appointments/:id/session-duration` endpoint.

---

## Database

Migrations (in order):

- `drizzle/0006_pusher_and_auscultation.sql` — `CREATE TABLE auscultation_sessions` with FKs to `health_facilities`, `patients`, `users`, `encounters`, `visits`, `appointments`, `attachments`, plus audit columns and four indexes (`facility`, `facility+patient`, `facility+doctor`, `appointment`).
- `drizzle/0007_drop_jaas_webhook_idempotency.sql` — `DROP TABLE jaas_webhook_idempotency CASCADE` since the webhook handler is gone.

Schema definitions added to `src/db/schema.ts`:
- `auscultation_sessions` table + `auscultationSessionsRelations`.
- `jaas_webhook_idempotency` table removed.

Attachment polymorphism (`src/constants/attachment-sources.ts`):
- New `sourceType` value `"AuscultationSession"` added to `ATTACHMENT_SOURCES` and to `ATTACHMENT_SOURCES_FACILITY_EXPLICIT_ONLY`, so the existing S3 presigned-upload flow at `src/modules/attachments/attachment.service.ts` handles stethoscope recordings without further plumbing.

---

## Realtime provider abstraction (`src/providers/`)

Mirrors the pre-existing `EmailProvider` / `SmsProvider` pattern.

- `types.ts` — added `RealtimeProvider` and `RealtimeAuth` interfaces.
- `pusher.provider.ts` — wraps the `pusher` Node SDK (added as a dependency in `package.json`). Reads `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`, `PUSHER_USE_TLS`. Implements `trigger(channels, event, data)` and `authorize(socketId, channel, userData?)`.
- `realtime-log.provider.ts` — dev fallback that pretty-prints every triggered event to the console and returns a stub auth payload. Auto-selected by `NotificationService` whenever `PUSHER_APP_ID` is unset.

---

## Notifications module (`src/modules/notifications/`)

- `notification.events.ts` — typed catalog of major events. Each kind declares `persist` (inbox row?), `email` (send via the existing `EmailService`?), and `channels(data, recipients) => string[]`. Adding a new event = one new entry here plus a `publish` call from the relevant feature module.

  Kinds shipped:
  - `telehealth.appointment.booked` — persist + email; routes to `private-user-{doctorUserId}` and `private-user-{patientUserId}`.
  - `telehealth.appointment.cancelled` — persist; same channels.
  - `telehealth.session.started` — realtime-only; `private-appointment-{id}`.
  - `telehealth.session.ended` — persist; `private-appointment-{id}`.
  - `auscultation.session.started` — persist; `private-user-{patientUserId}` + `private-auscultation-{sessionId}`.
  - `auscultation.session.ended` — persist; `private-auscultation-{sessionId}`.
  - `auscultation.recording.ready` — persist; `private-user-{doctorUserId}`.

- `notification.repository.ts` — straight `db` access (no facility scope — `notifications` is user-scoped). Methods: `insertMany`, `listForUser`, `findByIdForUser`, `markSeen`, `markAllSeen`.

- `notification.service.ts` — central `publish(event)` fan-out. Best-effort: realtime/email failures are logged but never thrown so a failed Pusher call does not break a domain operation. Also exposes inbox accessors (`listForUser`, `markSeen`, `markAllSeen`) and a `getRealtime()` helper consumed by the Pusher auth controller.

- `notification.controller.ts` — REST endpoints for the inbox.

- `pusher-auth.controller.ts` — handler for `POST /api/v1/pusher/auth`. Authorizes private channel subscriptions:
  - `private-user-{id}` → allowed iff `id === req.user.id`.
  - `private-appointment-{id}` → allowed iff caller is the doctor or patient on the appointment **and** the appointment is in caller's facility.
  - `private-auscultation-{id}` → same rule, scoped against the auscultation row.
  - Anything else → 403.

  The patient-side lookup walks `users → persons → patients` because `patients.id` is not directly a user id.

Routes (`src/routes/`):

- `notification.routes.ts` → mounted at `/api/v1/notifications`
  - `GET /` — paginated inbox (`unreadOnly=true|false`).
  - `PATCH /:id/seen` — mark one seen.
  - `POST /mark-all-seen` — mark all seen.
- `pusher.routes.ts` → mounted at `/api/v1/pusher`
  - `POST /auth` — server signs a Pusher private-channel subscription.

---

## Tele-Auscultation module (`src/modules/tele-auscultation/`)

- `auscultation.repository.ts` — extends `FacilityRepository`. Methods: `create`, `findById`, `markStarted`, `markEnded`, `attachRecording`, `list`.

- `auscultation.service.ts`:
  - `startSession({ patientId, encounterId?, visitId?, appointmentId? })` — verifies the caller is a doctor, inserts a session row with `roomName = shg-aus-{id}`, mints **doctor (moderator)** and **patient (non-moderator)** JaaS JWTs via the existing `JitsiJaasService`, builds audio-only join URLs (`#config.startAudioOnly=true&config.disableVideo=true&config.startWithVideoMuted=true`), and publishes `auscultation.session.started` to the patient's `private-user-{id}` channel with the patient join URL as data — that's the message the patient app reacts to in order to auto-fill its "Tele-Auscultation Link" field.
  - `getJoinLink({ sessionId, as: 'doctor' | 'patient' })` — mirrors `TelehealthService.getJoinLink`, hands back a fresh short-lived JWT.
  - `stopSession(sessionId)` — sets `endedAt`, computes `durationSeconds`, status `ended`, publishes `auscultation.session.ended`.
  - `attachRecording(sessionId, attachmentId)` — links a previously uploaded `attachments` row (created via the standard S3 presigned-upload flow with `sourceType: "AuscultationSession"`) to the session and publishes `auscultation.recording.ready` to the doctor's user channel.
  - `getById`, `list` — read APIs.

- `auscultation.controller.ts` + `src/routes/tele-auscultation.routes.ts` (mounted at `/api/v1/tele-auscultation`):
  - `GET /sessions` — list (filters: `patientId`, `encounterId`, `visitId`).
  - `POST /sessions` — start session (doctor only).
  - `GET /sessions/:id` — fetch one.
  - `POST /sessions/:id/join?as=doctor|patient` — fresh join link.
  - `PATCH /sessions/:id/stop` — end the session.
  - `POST /sessions/:id/recording` — attach an already-uploaded recording (body: `{ attachmentId }`).

Validation: `src/validations/tele-auscultation.validation.ts` (start / join / recording / list schemas).

---

## Hooks into existing flows

- **`TelehealthService.bookTelehealthAppointment`** — the previous direct `EmailService.send(...)` call to the doctor was replaced with `notificationService.publish("telehealth.appointment.booked", ...)`. Behavior preserved: the doctor still gets an email because `telehealth.appointment.booked` is configured `email: true` in the catalog. Newly added: an inbox row for both doctor and patient (when the patient has a user account), and a Pusher event on both user channels.

- **`TelehealthService.updateSessionDuration`** — the endpoint the client already calls when the Jitsi iframe reports session end. Now also publishes `telehealth.session.ended` (with `durationSeconds`) when `endedAt` is set. This replaces the previous webhook-driven emission.

---

## Removed (this session)

The JaaS webhook surface is gone because the client-side iframe already reports session timing via the existing PATCH:

- `src/modules/webhooks/jitsi-jass/jaas-webhook.service.ts` — deleted.
- `src/modules/webhooks/jitsi-jass/jaas-webhook.controller.ts` — deleted.
- `src/routes/jaas-webhook.routes.ts` — deleted.
- `src/middlewares/jaas-webhook-auth.middleware.ts` — deleted.
- `jaas_webhook_idempotency` table — dropped in migration `0007`.
- `JITSI_WEBHOOK_SECRET` env var — removed from `.env.example` and `.env.development`.

`src/modules/webhooks/jitsi-jass/jitsi-jaas.service.ts` is **kept** — that's the JWT-minting helper still used by both telehealth and tele-auscultation.

---

## Configuration

New env vars (defaults in `.env.example`):

```
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=mt1
PUSHER_USE_TLS=true
AUSCULTATION_JOIN_JWT_EXPIRES_IN=2h
```

Leave `PUSHER_APP_ID` blank and the realtime layer transparently falls back to `RealtimeLogProvider` (events print to stdout) — useful for local dev.

New dependency: `pusher@5.x` (Node server SDK), added to `package.json` via `yarn add pusher`.

---

## Verification done

- `yarn build` — TypeScript compiles cleanly.
- `yarn test` — full suite green (161/161 across 23 suites).
- `yarn db:migrate` — both `0006` (create `auscultation_sessions`) and `0007` (drop `jaas_webhook_idempotency`) applied to local dev DB.
- Boot smoke test — `yarn dev` → `GET /api/v1/health` returns 200; the three new routes (`/notifications`, `/pusher/auth`, `/tele-auscultation/sessions`) all return 401 without a bearer token, confirming the router is mounted and `authMiddleware` is gating them.

---

## Out of scope (intentional follow-ups)

- Server-side JaaS recording (Premium feature). Today, recordings come from the client (MediaRecorder API) and upload via the existing `attachments` presigned-upload route with `sourceType: "AuscultationSession"`.
- SMS / FCM / mobile push providers. The `RealtimeProvider` + event-catalog pattern is set up so adding one is local: drop a new provider class in `src/providers/`, plug it into `NotificationService`.
- Appointment-reminder cron (T-15min). No scheduler exists in the repo yet; this would need a job runner.
- FHIR `Media` resource mapping for the auscultation recording on the `/fhir` projection.

---

## How a frontend integrates

```ts
// 1. Pusher client setup (browser)
const pusher = new Pusher(PUSHER_KEY, {
  cluster: PUSHER_CLUSTER,
  channelAuthorization: {
    endpoint: '/api/v1/pusher/auth',
    headers: { Authorization: `Bearer ${apiJwt}` },
  },
});

// 2. Subscribe to your inbox
const inbox = pusher.subscribe(`private-user-${currentUserId}`);

inbox.bind('telehealth.appointment.booked', (e) => { /* toast, refresh list */ });
inbox.bind('auscultation.session.started', (e) => {
  // e.joinUrl is the patient JWT-signed Jitsi URL — auto-fill the UI field.
  patientAuscultationLinkField.value = e.joinUrl;
});

// 3. Inbox REST (for older notifications)
fetch('/api/v1/notifications?unreadOnly=true');
```
