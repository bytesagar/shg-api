# SHG API

An open-source, multi-tenant healthcare API for facilities to register patients, manage clinical workflows, and run telehealth consultations. The system is built with Node.js + Express, Drizzle ORM + PostgreSQL, and Zod for request validation.

For a full architecture guide (what/why/how + flow diagrams), see `docs/ARCHITECTURE.md`.

## Purpose

- Provide a secure, multi-tenant backend where users belong to a specific facility and can only access their facility’s data.
- Support clinical features such as patient registration and encounters/visits with structured records (vitals, histories, complaints, exams, diagnoses, tests, treatments, medications, documents).
- Enable telehealth consultations using Jitsi as a Service (JaaS), with secure JWT-based join links and optional email notifications to clinicians.

## Core Principles

- Facility isolation by default: every query is scoped to the authenticated user’s facility.
- Repository-driven data access: services never query the database directly; they use repositories that automatically apply facility filters.
- Validation at the edge: all inbound requests are validated with Zod schemas.
- Declarative filters: a small JSON DSL compiles to Drizzle SQL for reusable and testable search/filter logic.
- Clean boundaries: appointments handle only scheduling; telehealth session metadata is stored in a separate table.

## Architecture

- Web framework: Express ([src/index.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/index.ts))
- Validation: Zod (schemas in `src/validations/`)
- ORM: Drizzle ORM + PostgreSQL (schema in [schema.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/db/schema.ts))
- Migrations: Drizzle Kit (SQL in `drizzle/`)
- Auth: JWT with a generic utility ([jwt.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/utils/jwt.ts))
- Facility context injection: [auth.middleware.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/middlewares/auth.middleware.ts) populates `req.context` with `{ facilityId, userId, role, userType }`
- Repository layer: base [FacilityRepository](file:///Users/bytesagar/smart-health-global/shg-api/src/repositories/facility-repository.ts) that enforces tenant scoping on every query
- Generic filter DSL: [sql-filter.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/utils/sql-filter.ts) → compiles to Drizzle SQL
- Swagger docs: comment-based OpenAPI in route files (e.g., [patient.routes.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/routes/patient.routes.ts))

### Data Model Highlights

- Patients are registered and managed per facility.
- Encounters/visits aggregate clinical sections via dedicated tables.
- Appointments are kept lean (who/when/status/service). Telehealth metadata is stored in a separate table:
  - Appointments: [schema.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/db/schema.ts)
  - Telehealth sessions: [schema.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/db/schema.ts)

### Telehealth (JaaS)

Implementation files: `src/services/jitsi-jaas.service.ts`, `src/services/telehealth.service.ts`, `src/controllers/telehealth.controller.ts`, `src/routes/telehealth.routes.ts`. How sessions work and how that design stays secure is described in the next section.

## Telehealth: how sessions work

Telehealth uses **Jitsi as a Service (JaaS)** for video. The API separates **scheduling** (appointments) from **meeting metadata** (telehealth sessions).

### Booking

1. A **facility-authenticated** user calls `POST /telehealth/appointments` with `patientId`, `doctorId`, and `scheduledAt` (and optional `reason`). The handler requires a facility context (`requireFacilityContext`).

2. The server checks that the **patient** and **doctor** exist, that the doctor has `userType` **doctor**, and that the doctor is **on the facility roster** for that exact date/time with service **`telehealth`** (see `RosterService.isUserOnRosterForBooking`). This blocks arbitrary provider selection outside published availability.

3. It creates an **appointment** row (`service: telehealth`, scoped to the caller’s facility) and a **`telehealth_sessions`** row: `provider` (e.g. `jitsi_jaas`), **`roomName`** derived deterministically from the appointment id (`shg-{appointmentId}`), and links via `appointment_id`.

4. The booking response includes **`meeting.provider`** and **`meeting.room`** only. It does **not** return a browser-ready join URL. That avoids leaking long-lived or shareable meeting links at booking time.

5. Optionally, if SMTP is configured, an email may be sent to the doctor with high-level details (not a raw join URL).

### Joining the call

1. When a participant is ready, a **facility-authenticated** user calls `POST /telehealth/appointments/{id}/join?as=doctor` or `...?as=patient`.

2. The server loads the appointment **only if it belongs to the JWT user’s facility** (`AppointmentRepository` uses facility scoping). It loads or creates the matching `telehealth_sessions` row and builds the JaaS base URL `https://8x8.vc/{appId}/{room}`.

3. It mints a **short-lived JaaS JWT** (RS256, default **15 minutes**; override with `JITSI_JOIN_JWT_EXPIRES_IN`) and returns a **`joinUrl`** that appends `?jwt=...` to the meeting URL. Doctor tokens request **moderator** privileges; patient tokens do not.

4. The browser or client opens **`joinUrl`**; **JaaS validates** the JWT. When the JWT expires, that URL alone is no longer sufficient to join.

### Data model

- **`appointments`**: who, when, status, facility, `service = telehealth`.
- **`telehealth_sessions`**: one row per telehealth appointment (`appointment_id` unique), room name, `started_at`, `ended_at`, `duration_seconds`, optional `jaas_session_id` (JaaS correlation).

### JaaS webhooks (session duration analytics)

Configure **JaaS Developer Console → Webhooks** to POST to:

`POST /api/v1/webhooks/jaas`

- Subscribe at least to **`ROOM_CREATED`** and **`ROOM_DESTROYED`** ([payload reference](https://developer.8x8.com/jaas/docs/webhooks-payload)).
- Set the webhook **Authorization** header to match **`JITSI_WEBHOOK_SECRET`** in `.env`. The API accepts either `Authorization: Bearer <secret>` or `Authorization: <secret>`.
- Events are **deduplicated** by `idempotencyKey` (`jaas_webhook_idempotency` table). **Breakout rooms** (`data.isBreakout === true`) are ignored.
- The handler parses `fqn` as `{AppID}/shg-{appointmentUuid}`, updates `telehealth_sessions` timings from the event `timestamp`, and recomputes `duration_seconds` when both start and end are known (ordering of events is not guaranteed by JaaS).

## Telehealth: security properties

- **API access**: All telehealth routes use **`authMiddleware`**. Booking and join-link generation also require **facility context** so tenant isolation matches the rest of the app.

- **Tenant isolation**: Appointment reads for join are **facility-scoped**. A user cannot request a join URL for another facility’s appointment id.

- **No long-lived meeting URLs from the API**: Join URLs are created **on demand** and embed a **time-limited** JaaS JWT. Private keys used to sign those JWTs stay in **environment variables** (`JITSI_JAAS_*`), not in code or logs (see Contribution Guidelines).

- **Transport**: Clients use **HTTPS** to this API and to `8x8.vc`; video media uses Jitsi/JaaS transport as provided by the vendor.

- **Roster gate**: Only doctors who are **scheduled on the telehealth roster** for the booked slot can be booked, reducing mistaken or abusive bookings.

- **Operational hygiene**: Keep `JWT_SECRET` strong for API tokens; rotate JaaS keys per vendor guidance; restrict `.env` in production; do not expose JaaS private keys to clients.

- **Webhooks**: `JITSI_WEBHOOK_SECRET` protects `POST /api/v1/webhooks/jaas` (not JWT). Use HTTPS and a long random secret; configure the same value in the JaaS console.

**Caveats**: Security also depends on **client apps** (protecting end-user sessions, who may call `as=patient`), **JaaS account** configuration, and **email** if used (SMTP TLS and recipient accuracy). This API layer enforces authentication, facility boundaries, roster rules, and short-lived vendor JWTs for the actual video room.

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 14+

### Install

```bash
npm install
```

### Configure Environment

Create a `.env` file and set:

- Database
  - `DATABASE_URL=postgres://user:pass@host:5432/dbname`
- JWT
  - `JWT_SECRET=your-app-jwt-secret`
- SMTP (optional, for email notifications)
  - `SMTP_HOST=...`
  - `SMTP_PORT=...`
  - `SMTP_USER=...`
  - `SMTP_PASS=...`
  - `SMTP_FROM=no-reply@example.com`
- Jitsi JaaS (optional, for telehealth)
  - `JITSI_JAAS_APP_ID=...`
  - `JITSI_JAAS_KID=...`
  - `JITSI_JAAS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"`
  - or `JITSI_JAAS_PRIVATE_KEY_PATH=/absolute/path/to/private-key.pk`
  - `JITSI_JOIN_JWT_EXPIRES_IN` (optional; default `15m` — lifetime of JaaS join JWTs)
  - `JITSI_WEBHOOK_SECRET` — shared secret for `POST /api/v1/webhooks/jaas` (must match JaaS webhook Authorization header)

### Database

```bash
npm run db:up       # starts postgres container
npm run db:migrate
npm run db:seed   # optional: seeds demo facilities and users
```

To stop containerized Postgres:

```bash
npm run db:down
```

### Run

```bash
npm run dev       # starts API with nodemon + ts-node
```

### Build

```bash
npm run build     # compiles TypeScript
npm start         # runs compiled JS (dist/index.js)
```

### API Docs

OpenAPI docs are embedded in route comments. Wire Swagger UI in your host app or inspect annotations in files like:

- Patients: [patient.routes.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/routes/patient.routes.ts)
- Health Facilities: [health-facility.routes.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/routes/health-facility.routes.ts)
- Encounters: [encounter.routes.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/routes/encounter.routes.ts)
- Telehealth: [telehealth.routes.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/routes/telehealth.routes.ts)

## Contribution Guidelines

### How to Contribute

- Fork the repo and create a feature branch: `feat/<short-description>` or `fix/<short-description>`
- Keep each PR focused; prefer multiple small PRs over one large one.
- Link to issues where applicable and describe the change clearly.

### Code Conventions

- Use Zod for input validation; add schemas in `src/validations/`.
- Add endpoints in controllers and routes mirroring existing patterns.
- Use the repository layer for all DB access:
  - Extend [FacilityRepository](file:///Users/bytesagar/smart-health-global/shg-api/src/repositories/facility-repository.ts) to enforce facility scope.
  - Never query with `db.select().from(...)` directly in controllers/services.
- For filtering/search, prefer the DSL in [sql-filter.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/utils/sql-filter.ts).
- Keep appointments scheduling-only; store telehealth or program metadata in dedicated tables.

### Database Changes

- Edit [schema.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/db/schema.ts) following the existing style.
- Generate a migration and review it:
  - `npm run db:generate -- --name <short_name>`
  - `npm run db:migrate` to apply locally
- Provide data-safe fallbacks in migrations when altering types (e.g., lowercasing strings, defaulting unknowns).

### Security

- Never commit secrets or private keys.
- Do not log secrets.
- JWT: use the abstraction in [jwt.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/utils/jwt.ts).
- Telehealth (JaaS): do not hardcode keys; load via env and sign with RS256.

### Quality Gates

- Build: `npm run build` must pass.
- If you touch Swagger docs, ensure annotations are valid and match request/response shapes.
- Add seed data only if it aids development; keep realistic and non-sensitive.

## Project Map (Selected)

- Routing: [routes/index.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/routes/index.ts)
- Auth
  - Middleware: [auth.middleware.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/middlewares/auth.middleware.ts)
  - JWT utils: [jwt.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/utils/jwt.ts)
- Facility context
  - Type: [facility-context.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/context/facility-context.ts)
  - Helper: [requireFacilityContext](file:///Users/bytesagar/smart-health-global/shg-api/src/utils/request-context.ts)
- Repositories
  - Base: [facility-repository.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/repositories/facility-repository.ts)
  - Patients: [patient.repository.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/repositories/patient.repository.ts)
  - Users: [user.repository.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/repositories/user.repository.ts)
  - Appointments: [appointment.repository.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/repositories/appointment.repository.ts)
- Services
  - Patients: [patient.service.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/services/patient.service.ts)
  - Encounters: [encounter.service.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/services/encounter.service.ts)
  - Encounter Records: [encounter-record.service.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/services/encounter-record.service.ts)
  - Telehealth: [telehealth.service.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/services/telehealth.service.ts)
  - Email: [email.service.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/services/email.service.ts)
- Validation
  - Patients: [patient.validation.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/validations/patient.validation.ts)
  - Encounters: [encounter.validation.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/validations/encounter.validation.ts)
  - Users: [user.validation.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/validations/user.validation.ts)
  - Telehealth: [telehealth.validation.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/validations/telehealth.validation.ts)

## License

ISC (see `package.json`). Please open issues for questions or to discuss improvements. We welcome contributions! 
