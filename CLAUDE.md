# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager: **yarn** (`yarn@1.22.22` per `package.json`). `npm run` works for the same scripts.

- Dev server: `yarn dev` (nodemon + ts-node, watches `src/`)
- Build: `yarn build` (`tsc && tsc-alias` — `tsc-alias` rewrites the `@/*` path aliases in emitted JS)
- Run built output: `yarn start` (runs `dist/index.js`; note the Dockerfile entrypoint is `dist/src/index.js` because of how `rootDir: "."` lays out emit)
- Tests: `yarn test` (Jest, ts-jest preset, `**/*.test.ts`). Single test: `yarn test src/modules/clinical-visits/visit.service.test.ts`. Watch: `yarn test:watch`.

Database (Drizzle Kit, dev config = `drizzle.config.dev.ts` reading `.env.development`):
- `yarn db:up` / `yarn db:down` / `yarn db:logs` — local Postgres via `docker-compose.local.yml`
- `yarn db:generate` — generate a new SQL migration into `drizzle/` after editing `src/db/schema.ts`. Use `--name <short_name>` for a readable filename.
- `yarn db:migrate` — apply migrations (runs `src/db/migrate.ts`, which itself loads `.env.development` or `.env.production` based on `NODE_ENV`)
- `yarn db:push` — push schema without migration (dev only)
- `yarn db:studio` — Drizzle Studio
- `yarn db:seed` / `yarn db:seed:prod` — seed demo data (`src/db/seed.ts`)

Env loading: `src/index.ts` and `src/db/migrate.ts` explicitly load `.env.development` or `.env.production` based on `NODE_ENV`. The `.env` file is not loaded by the app at runtime — edit the `.env.<env>` files instead. `.env.example` lists required vars.

## Architecture

Express + Drizzle ORM + PostgreSQL + Zod, multi-tenant by health facility. The codebase enforces a strict **Routes → Controller → Service → Repository → Drizzle** layering; the `.trae/skills/node-express-drizzle-backend/SKILL.md` file documents the conventions in detail and should be treated as authoritative when adding features.

### Request lifecycle

1. `src/index.ts` → `createApp()` in `src/app.ts` mounts CORS (origins from `CORS_ORIGINS`), `cookieParser`, JSON/urlencoded parsers, `loggerMiddleware`, Swagger UI at `/docs`, and the API router under `APP_CONFIG.API_PREFIX` (`/api/v1`).
2. The router (`src/routes/index.ts`) groups feature routers (`/auth`, `/patients`, `/encounters`, `/telehealth`, `/fhir`, etc.). Most feature routers apply `authMiddleware` per-route.
3. `authMiddleware` (`src/middlewares/auth.middleware.ts`) verifies the bearer JWT, requires `facilityId` on the payload, optionally honors an `x-facility-id` header (admin can pick any facility; doctors must have an active row in `user_facility_affiliations` for that facility; other roles cannot cross facilities), normalizes the role via `normalizeRole`, and writes `req.user` plus `req.context: FacilityContext = { facilityId, userId, role, userType }`.
4. Controllers extract `req.context` via `requireFacilityContext(req)` (`src/utils/request-context.ts`), validate input with Zod (`src/validations/`), construct a service with the context, and respond using `BaseController.ok/created/noContent`.
5. Errors propagate through `catchAsync` and the central error handler in `app.ts`. `AppError` carries an HTTP status; `LogService` records warns (`AppError`) or errors (anything else).

### Multi-tenancy: the facility scope contract

The repository layer is the **only** place that touches Drizzle, and tenant isolation is enforced there. Every facility-scoped repository extends `FacilityRepository` (`src/core/facility-repository.ts`):

```ts
export class PatientRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, patients.facilityId); // declares which column carries facility_id
  }
}
```

Inside the repository, **every** query must pass its `where` through `this.withFacilityScope(where)`, which `AND`s `eq(facilityColumn, context.facilityId)` onto the predicate. Bypassing this (e.g. raw `db.select().from(...)` in a service or controller) breaks tenant isolation. Cross-facility joins must include the facility predicate manually (see `PatientRepository.findDetailById` and the `findDuplicateCandidate` joins for examples).

Services receive a `FacilityContext` in their constructor and instantiate the relevant repositories with it; they never import `db` directly except for read-only orchestration that already filters by facility (a few existing controllers do this for summary aggregations — when extending, prefer the repository pattern).

### Path aliases

`tsconfig.json` defines `@/* → src/*` plus per-area aliases (`@modules/*`, `@routes/*`, `@db/*`, `@utils/*`, `@middlewares/*`, `@config/*`, `@context/*`). Runtime resolution: `nodemon`/`ts-node` use `tsconfig-paths/register`; the build uses `tsc-alias` to rewrite imports in `dist/`. Jest uses `pathsToModuleNameMapper` from `jest.config.js`. If you add a new alias, update all three.

### Module layout

Code is organized **by feature** under `src/modules/<feature>/` (controller + service + repository, e.g. `src/modules/patients/patient.{controller,service,repository}.ts`). Wiring lives outside the modules:

- Routes: `src/routes/<feature>.routes.ts` (mounted in `src/routes/index.ts`)
- Validation schemas: `src/validations/<feature>.validation.ts` (Zod)
- Database schema (single file): `src/db/schema.ts` (~2.5k lines, all tables + enums + relations)
- Cross-cutting middlewares: `src/middlewares/` (`auth`, `authorize`, `rbac`, `logger`, `jaas-webhook-auth`)

Some legacy `src/services/...`, `src/controllers/...`, and `src/repositories/...` folders are referenced from the README but the current code lives under `src/modules/`. Treat `src/modules/` as canonical.

### RBAC

Roles and permission lists are centralized in `src/constants/rbac.ts`. The middleware `authorize([...roles])` gates by role (after `normalizeRole`); `authorizePermission("perm:string")` gates by the permission strings in `ROLE_PERMISSIONS`. Convenience role groups: `CLINICAL_READ_ROLES`, `CLINICAL_WRITE_ROLES`, `COMMUNITY_WRITE_ROLES`, `FACILITY_MANAGEMENT_ROLES`, `ADMIN_ONLY_ROLES`. Role aliases: `facility → hfuser`, `municipality|palika → municipalityuser`.

### Filter DSL

`src/utils/sql-filter.ts` defines a JSON-shaped `SqlFilter` type that compiles to Drizzle SQL via `toSqlWhere`, with `andFilter`/`orFilter` helpers. Services build filters declaratively and pass the compiled `SQL` to repository methods; prefer this over hand-written query building when adding search/list endpoints. List query parsing helpers live in `src/utils/query-parser.ts`.

### Telehealth (Jitsi JaaS)

Scheduling and meeting metadata are intentionally separated:
- `appointments` table — when/who/status/service (lean)
- `telehealth_sessions` table — provider, deterministic `roomName = shg-{appointmentId}`, timing fields, `jaas_session_id`

`POST /telehealth/appointments` creates both rows after verifying the doctor is on the facility's `telehealth` roster for that slot. The booking response returns `meeting.provider` and `meeting.room` only — **no join URL**. Join URLs are minted on demand by `POST /telehealth/appointments/:id/join?as=doctor|patient`, which mints a short-lived RS256 JaaS JWT (default 15m, override via `JITSI_JOIN_JWT_EXPIRES_IN`) and returns the full `https://8x8.vc/{appId}/{room}?jwt=...` URL. Doctor tokens carry moderator privileges; patient tokens do not.

JaaS webhooks land at `POST /api/v1/webhooks/jaas`, authenticated by the `JITSI_WEBHOOK_SECRET` shared secret (Bearer or raw). Events are deduplicated via the `jaas_webhook_idempotency` table; breakout-room events are ignored. The handler parses the `fqn` `{AppID}/shg-{appointmentUuid}` and updates `telehealth_sessions` timings (start/end events can arrive out of order — recompute `duration_seconds` only when both are known).

### Database conventions

- Drizzle config sets `casing: "snake_case"` — TypeScript fields are `camelCase`, columns become `snake_case`. Both `drizzle.config.*.ts` and `db/index.ts` agree on this; do not override per-table.
- Migrations live under `drizzle/` and are applied by `src/db/migrate.ts`. Never hand-edit a generated SQL migration; regenerate via `yarn db:generate`.
- Person-vs-Patient separation: a `Person` is the canonical human; `Patient` (clinical), `User` (auth), and `Practitioner` are roles linked back to a person. The same person can be both a patient and a practitioner. Names/contacts/addresses/identifiers are normalized into `person_*` tables (with an `is_primary` flag); patient-specific identifiers go in `patient_identifiers`.

### API response envelope

`BaseController` enforces `{ success, message, data }` for OK/Created responses and `{ success: false, message }` from the error middleware. The `.trae` skill file describes a different `{ data, meta }` envelope — the codebase currently uses the `{ success, message, data }` shape, so match existing controllers when adding endpoints.

### FHIR layer

`/api/v1/fhir/*` exposes FHIR-style search returning `Bundle` payloads. It is a translation layer over the relational schema (`src/modules/fhir-search/`): `fhir-search.query.ts` translates FHIR-like params to SQL, `fhir-resource.mappers.ts` maps rows to FHIR resources, and `fhir-profile.registry.ts` attaches `meta.profile`. Storage stays relational; FHIR is read-only projection.
