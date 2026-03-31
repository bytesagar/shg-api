# SHG API

An open-source, multi-tenant healthcare API for facilities to register patients, manage clinical workflows, and run telehealth consultations. The system is built with Node.js + Express, Drizzle ORM + PostgreSQL, and Zod for request validation.

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

- JaaS integration service: [jitsi-jaas.service.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/services/jitsi-jaas.service.ts)
- Telehealth booking + join links: [telehealth.service.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/services/telehealth.service.ts), [telehealth.controller.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/controllers/telehealth.controller.ts), [telehealth.routes.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/routes/telehealth.routes.ts)
- Uses RS256 with your JaaS private key and `kid` header; supports `JITSI_JAAS_PRIVATE_KEY` (PEM string with `\n`) or `JITSI_JAAS_PRIVATE_KEY_PATH`.

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

### Database

```bash
npm run db:migrate
npm run db:seed   # optional: seeds demo facilities and users
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
