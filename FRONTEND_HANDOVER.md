# Frontend Handover — Pusher Notifications + Tele-Auscultation

This document hands off two new backend surfaces to the frontend:

1. A **realtime notifications layer** over Pusher Channels (plus a REST inbox).
2. A **tele-auscultation** workflow where the doctor opens a Jitsi audio-only room and the patient app auto-fills a join link delivered via Pusher.

Everything described here lives behind `Authorization: Bearer <jwt>` (the same JWT you already use for the rest of the API). All authenticated requests honor `x-facility-id` for cross-facility users where applicable.

API base path: `/api/v1`.

---

## 1. Prerequisites

### Install
```
npm i pusher-js
```

### Environment (frontend `.env`)
```
VITE_PUSHER_KEY=<PUSHER_KEY from backend>
VITE_PUSHER_CLUSTER=<PUSHER_CLUSTER from backend>
VITE_API_BASE_URL=https://<api host>/api/v1
```

The backend reads `PUSHER_APP_ID/KEY/SECRET/CLUSTER`. If `PUSHER_APP_ID` is unset in dev, the backend transparently logs events to its stdout instead of pushing — your subscriptions will go quiet but the inbox REST API and all other features still work. Coordinate with backend for the real key/cluster values before testing realtime in dev.

---

## 2. Pusher client setup

```ts
import Pusher from "pusher-js";

export function createPusher(apiJwt: string) {
  return new Pusher(import.meta.env.VITE_PUSHER_KEY, {
    cluster: import.meta.env.VITE_PUSHER_CLUSTER,
    forceTLS: true,
    channelAuthorization: {
      endpoint: `${import.meta.env.VITE_API_BASE_URL}/pusher/auth`,
      transport: "ajax",
      headers: { Authorization: `Bearer ${apiJwt}` },
    },
  });
}
```

Pusher's JS SDK will POST `socket_id` and `channel_name` (as `application/x-www-form-urlencoded`) to `/pusher/auth` whenever you subscribe to a private channel. The backend authorizes the subscription against your JWT.

### Channels you may subscribe to

| Channel | Who can subscribe | What flows through |
|---|---|---|
| `private-user-{userId}` | only that user | Personal events: appointment booked, auscultation requested as patient, recording ready, etc. |
| `private-appointment-{appointmentId}` | the appointment's doctor or patient (same facility) | Session start/end signals tied to a telehealth appointment |
| `private-auscultation-{sessionId}` | the session's doctor or patient (same facility) | Auscultation session lifecycle events |

Anything else → the auth endpoint returns **403**. Cross-facility subscriptions are also rejected.

### Subscribing

```ts
const pusher = createPusher(apiJwt);
const me = pusher.subscribe(`private-user-${currentUserId}`);

me.bind("pusher:subscription_succeeded", () => console.log("subscribed"));
me.bind("pusher:subscription_error", (e) => console.error("sub error", e));

me.bind("telehealth.appointment.booked", (e) => { /* see §5 for payload */ });
me.bind("auscultation.session.started", (e) => { /* see §5 */ });
```

Unsubscribe on logout: `pusher.unsubscribe(channel); pusher.disconnect();`.

---

## 3. Inbox REST API

The same events that go over Pusher are also persisted to the `notifications` table (for kinds flagged `persist: true` — see §5). This is the "missed it while offline" surface.

Base path: `/api/v1/notifications`. Auth required.

### `GET /notifications`

Query params: standard pagination + `unreadOnly=true|false`.

```http
GET /api/v1/notifications?page=1&pageSize=20&unreadOnly=true
Authorization: Bearer <jwt>
```

Response envelope (same `{ success, message, data }` shape used everywhere):

```json
{
  "success": true,
  "message": "Notifications retrieved",
  "data": {
    "items": [
      {
        "id": "uuid",
        "userId": "uuid",
        "title": "Telehealth appointment booked",
        "description": "Telehealth consult with John Doe scheduled at 2026-05-20",
        "seen": false,
        "module": "telehealth",
        "moduleId": "<appointmentId>",
        "createdAt": "2026-05-18T03:14:00.000Z",
        "updatedAt": null
      }
    ],
    "total": 4,
    "page": 1,
    "pageSize": 20
  }
}
```

### `PATCH /notifications/:id/seen`

Marks a single notification seen. Returns the updated row.

### `POST /notifications/mark-all-seen`

Returns `204 No Content`.

---

## 4. Tele-auscultation workflow

Concept: The doctor opens an audio-only Jitsi room. The patient app receives a Pusher event whose payload **is the patient's signed Jitsi URL**. Patient app auto-fills its "Tele-Auscultation Link" UI field with that URL and renders a button that opens the Jitsi room. Microphone audio (ideally from a digital stethoscope) streams to the doctor over Jitsi. When the doctor stops the session, both sides are notified.

Recording is optional and uses the existing attachment / S3 presigned upload flow.

### 4.1 Doctor: start a session

```http
POST /api/v1/tele-auscultation/sessions
Authorization: Bearer <doctor jwt>
Content-Type: application/json

{
  "patientId": "uuid",
  "encounterId": "uuid",      // optional
  "visitId": "uuid",          // optional
  "appointmentId": "uuid"     // optional — set if this is inside a telehealth consult
}
```

`201` response:

```json
{
  "success": true,
  "message": "Auscultation session started",
  "data": {
    "session": {
      "id": "uuid",
      "facilityId": "uuid",
      "patientId": "uuid",
      "doctorId": "uuid",
      "encounterId": "uuid|null",
      "visitId": "uuid|null",
      "appointmentId": "uuid|null",
      "provider": "jitsi_jaas",
      "roomName": "shg-aus-<uuid>",
      "status": "pending",
      "startedAt": null,
      "endedAt": null,
      "durationSeconds": 0,
      "recordingAttachmentId": null,
      "createdAt": "...",
      "updatedAt": null
    },
    "doctor": {
      "joinUrl": "https://8x8.vc/<appId>/<room>?jwt=<doctorJwt>#config.startAudioOnly=true&config.disableVideo=true&config.startWithVideoMuted=true",
      "room": "shg-aus-<uuid>"
    },
    "patient": {
      "joinUrl": "https://8x8.vc/<appId>/<room>?jwt=<patientJwt>#config.startAudioOnly=true&config.disableVideo=true&config.startWithVideoMuted=true",
      "userIds": ["uuid", ...]
    }
  }
}
```

Doctor UI: open `data.doctor.joinUrl` (or render `<iframe src=...>`). The session is `pending` until you mark it started (typically by calling the join endpoint, or implicitly — see §4.5 about the iframe events).

Behind the scenes the server **also** publishes `auscultation.session.started` to `private-user-{patientUserId}` and to `private-auscultation-{sessionId}`.

### 4.2 Patient: auto-fill flow

Patient app subscribed to `private-user-{currentUserId}` will receive:

```ts
me.bind("auscultation.session.started", (e: AuscultationStartedEvent) => {
  // e = {
  //   kind: "auscultation.session.started",
  //   sessionId: "uuid",
  //   doctorName: "Dr. Jane Smith",
  //   patientName: "John Doe",
  //   joinUrl: "https://8x8.vc/.../?jwt=...#config.startAudioOnly=true...",
  //   moduleId: "uuid"
  // }
  setAuscultationLinkField(e.joinUrl);  // ← auto-fill the UI field
  toast.info(`${e.doctorName} requests an auscultation`);
});
```

When the patient taps the field's "Join" button, render the Jitsi iframe pointing at `e.joinUrl`. The URL already embeds:
- A short-lived RS256 JWT (TTL controlled by `AUSCULTATION_JOIN_JWT_EXPIRES_IN`, default 2h).
- The Jitsi config flags `startAudioOnly=true`, `disableVideo=true`, `startWithVideoMuted=true` so video is suppressed at session start.

### 4.3 Doctor or patient: get a fresh join link

If the JWT in the original URL expires (e.g. patient leaves and comes back later), mint a new one:

```http
POST /api/v1/tele-auscultation/sessions/{id}/join?as=doctor
POST /api/v1/tele-auscultation/sessions/{id}/join?as=patient
```

Response:
```json
{ "success": true, "data": { "joinUrl": "...", "room": "shg-aus-<uuid>" } }
```

### 4.4 Doctor: stop the session

```http
PATCH /api/v1/tele-auscultation/sessions/{id}/stop
```

Server marks the session ended, computes `durationSeconds`, and publishes `auscultation.session.ended` to `private-auscultation-{sessionId}`.

Response: the updated session row.

### 4.5 Recording (optional)

If the patient app records the stethoscope audio locally (e.g. via `MediaRecorder`), the upload path is the existing attachments flow with `sourceType: "AuscultationSession"`:

```ts
// 1. Ask backend for a presigned PUT URL.
const presign = await fetch("/api/v1/attachments/generate-upload-url", {
  method: "POST",
  headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    fileName: `auscultation-${sessionId}.webm`,
    fileType: "audio/webm",
    sourceType: "AuscultationSession",
    sourceId: sessionId,
    facilityId: <your facility id>,     // required for AuscultationSession sources
    fileSize: blob.size,
  }),
}).then((r) => r.json());

// 2. PUT the audio bytes directly to S3.
await fetch(presign.data.uploadUrl, {
  method: "PUT",
  headers: { "Content-Type": "audio/webm" },
  body: blob,
});

// 3. Confirm the upload, creating the `attachments` row.
const created = await fetch("/api/v1/attachments", {
  method: "POST",
  headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: `Auscultation ${new Date().toISOString()}`,
    sourceType: "AuscultationSession",
    sourceId: sessionId,
    fileUrl: presign.data.fileUrl,
    fileType: "audio/webm",
    fileSize: blob.size,
    facilityId: <your facility id>,
  }),
}).then((r) => r.json());

// 4. Link the attachment to the session — server pushes
//    `auscultation.recording.ready` to the doctor.
await fetch(`/api/v1/tele-auscultation/sessions/${sessionId}/recording`, {
  method: "POST",
  headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
  body: JSON.stringify({ attachmentId: created.data.id }),
});
```

**Backend env you may need to ask backend to update before audio uploads work in your environment**: `ATTACHMENT_ALLOWED_CONTENT_TYPES` currently lists PDF + image MIME types only. Audio (e.g. `audio/webm`) must be added to that env value before the presign endpoint will accept it. Likewise `ATTACHMENT_MAX_BYTES` (default 26 MB) may need bumping for longer recordings.

### 4.6 Reading sessions

- `GET /api/v1/tele-auscultation/sessions/{id}` — fetch one.
- `GET /api/v1/tele-auscultation/sessions?patientId=...&encounterId=...&visitId=...&page=1&pageSize=20` — paginated list.

---

## 5. Event payload reference

Every realtime payload includes a `kind` field equal to the event name. `moduleId` is the resource id that the notification is "about" (handy for clicking through from an inbox row).

| `kind` | Persists to inbox? | Channels | Payload (in addition to `kind`) |
|---|---|---|---|
| `telehealth.appointment.booked` | yes (doctor + patient) — and emails the recipients | `private-user-{doctorUserId}`, `private-user-{patientUserId}` | `{ appointmentId, doctorUserId, patientUserId, doctorName, patientName, scheduledAt, moduleId }` |
| `telehealth.appointment.cancelled` | yes | `private-user-{...}` for each recipient | `{ appointmentId, scheduledAt?, moduleId }` |
| `telehealth.session.started` | no | `private-appointment-{appointmentId}` | (currently not auto-emitted by the backend — reserved for a future "joined" trigger) |
| `telehealth.session.ended` | yes | `private-appointment-{appointmentId}` | `{ appointmentId, durationSeconds, moduleId }` — fired when the client PATCHes `session-duration` with `endedAt` |
| `auscultation.session.started` | yes (recipient = patient user) | `private-user-{patientUserId}`, `private-auscultation-{sessionId}` | `{ sessionId, doctorName, patientName, joinUrl, moduleId }` — `joinUrl` is the patient-scoped Jitsi URL with embedded JWT |
| `auscultation.session.ended` | yes | `private-auscultation-{sessionId}` | `{ sessionId, durationSeconds, moduleId }` |
| `auscultation.recording.ready` | yes (recipient = doctor) | `private-user-{doctorUserId}` | `{ sessionId, attachmentId, moduleId }` |

`"persist": true` means a row also exists in the inbox REST API and will survive the user being offline. `"persist": false` events are realtime-only.

---

## 6. Telehealth booking — small response change

`POST /api/v1/telehealth/appointments` previously returned `emailSent` / `emailError` fields. Those are **gone**.

New response shape (`201`):

```json
{
  "success": true,
  "message": "Telehealth appointment booked successfully",
  "data": {
    "appointment": { "id": "uuid", "doctorId": "...", "patientId": "...", "date": "...", "status": "scheduled", "service": "telehealth", ... },
    "meeting": {
      "provider": "jitsi_jaas",
      "room": "shg-<appointmentId>"
    }
  }
}
```

If you previously read `result.data.emailSent`, drop it. The doctor still gets an email (it's wired through the notification service now, since `telehealth.appointment.booked` is configured with `email: true`).

The companion endpoints are unchanged:

- `POST /api/v1/telehealth/appointments/{id}/join?as=doctor|patient` — fresh join link.
- `PATCH /api/v1/telehealth/appointments/{id}/session-duration` — body: `{ durationSeconds: int, startedAt?: ISO8601, endedAt?: ISO8601 }`. **Important**: this is now the canonical signal that a session ended. When you include `endedAt`, the backend publishes `telehealth.session.ended`. Call this from the Jitsi iframe's `readyToClose` / `videoConferenceLeft` events on the client side.

---

## 7. Jitsi iframe — how the client owns session timing

The JaaS server-side webhook is gone. **The client is now authoritative for session start/end**, using the Jitsi iframe API (`@jitsi/web-sdk` or raw `JitsiMeetExternalAPI`).

Sketch:

```ts
const api = new JitsiMeetExternalAPI("8x8.vc", {
  roomName: `<appId>/${room}`,            // appId+room from backend
  jwt: jwtFromJoinUrl,                    // strip from joinUrl, or just point iframe at joinUrl directly
  parentNode: container,
  configOverwrite: { startAudioOnly: true, disableVideo: true, startWithVideoMuted: true },
});

const startedAt = new Date();

api.addListener("videoConferenceJoined", () => {
  // (optional) hit a future "started" endpoint if/when one exists
});

api.addListener("readyToClose", async () => {
  const endedAt = new Date();
  await fetch(`/api/v1/telehealth/appointments/${appointmentId}/session-duration`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      durationSeconds: Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)),
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
    }),
  });
  // Server will publish telehealth.session.ended to the appointment channel.
});
```

Apply the same pattern for tele-auscultation: call `PATCH /tele-auscultation/sessions/{id}/stop` from `readyToClose` on the doctor side.

---

## 8. Auth / authz cheatsheet

- All endpoints in this handover require `Authorization: Bearer <jwt>` from the existing login flow.
- `/pusher/auth` is authenticated; it returns **403** if you try to subscribe to a channel you do not own.
- `private-appointment-{id}` and `private-auscultation-{id}` are **facility-scoped**. If you log in to facility A and try to subscribe to an appointment owned by facility B, you'll get 403.
- For cross-facility doctors, include `x-facility-id` on requests the same way you do today.

---

## 9. Common patterns

### Display a live inbox + badge

```ts
// 1. On app boot, fetch the unseen count.
const initial = await fetch("/api/v1/notifications?unreadOnly=true&pageSize=1")
  .then((r) => r.json());
setBadgeCount(initial.data.total);

// 2. Live-increment when new realtime events arrive.
const me = pusher.subscribe(`private-user-${userId}`);
const inc = () => setBadgeCount((c) => c + 1);
me.bind("telehealth.appointment.booked", inc);
me.bind("auscultation.session.started", inc);
me.bind("auscultation.recording.ready", inc);

// 3. When user opens the inbox drawer, mark-all-seen and zero the badge.
await fetch("/api/v1/notifications/mark-all-seen", {
  method: "POST",
  headers: { Authorization: `Bearer ${jwt}` },
});
setBadgeCount(0);
```

### Patient: auto-fill auscultation link

```tsx
function AuscultationLinkField() {
  const [link, setLink] = useState<string | null>(null);
  const pusher = usePusher(); // singleton from your auth context
  useEffect(() => {
    const ch = pusher.subscribe(`private-user-${currentUserId}`);
    const handler = (e: any) => setLink(e.joinUrl);
    ch.bind("auscultation.session.started", handler);
    return () => { ch.unbind("auscultation.session.started", handler); };
  }, []);
  if (!link) return <div>Awaiting tele-auscultation request…</div>;
  return (
    <div>
      <input readOnly value={link} />
      <button onClick={() => openJitsi(link)}>Join auscultation</button>
    </div>
  );
}
```

---

## 10. Error responses

The API returns the standard envelope on errors:

```json
{ "success": false, "message": "<human-readable reason>" }
```

Common cases for the new endpoints:

| HTTP | When |
|---|---|
| 400 | Body fails Zod validation (`Validation failed: <field>: <reason>`); bad `as` query on join. |
| 401 | Missing/invalid bearer token. |
| 403 | Pusher auth refusing a channel you don't own; non-doctor calling `POST /tele-auscultation/sessions`. |
| 404 | Auscultation session / appointment / patient not found in your facility. |
| 409 | Telehealth same-day booking conflict (existing endpoint). |
| 413 | Recording exceeds `ATTACHMENT_MAX_BYTES`. |
| 503 | Attachment storage (S3) not configured on the server. |

---

## 11. Quick checklist for the FE team

- [ ] Install `pusher-js`; wire `createPusher(jwt)` into your auth bootstrap.
- [ ] On login, subscribe to `private-user-${userId}`; on logout, `unsubscribe` + `disconnect`.
- [ ] Build an inbox surface against `GET /notifications`, `PATCH /:id/seen`, `POST /mark-all-seen`.
- [ ] Doctor flow: add a "Start Tele-Auscultation" button on the encounter / consult screen → `POST /tele-auscultation/sessions` → embed Jitsi at `data.doctor.joinUrl` → on iframe `readyToClose`, `PATCH /sessions/:id/stop`.
- [ ] Patient flow: render a "Tele-Auscultation Link" field that auto-fills from the `auscultation.session.started` event; on user tap, embed Jitsi at the field's URL.
- [ ] Telehealth iframe: replace any reliance on a server webhook with a `PATCH /telehealth/appointments/:id/session-duration` call from `readyToClose`.
- [ ] Remove any code that reads `emailSent`/`emailError` from the booking response.
- [ ] Coordinate with backend before testing auscultation recording uploads — `audio/*` MIME types may not yet be in `ATTACHMENT_ALLOWED_CONTENT_TYPES`.
