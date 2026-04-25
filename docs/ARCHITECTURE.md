# SHG API Architecture (High-Level)

## 1) What This Project Does

`shg-api` is a multi-tenant healthcare backend for health facilities. It supports:

- identity + access (users, roles, sessions, audit)
- person and patient registration
- clinical operations (visits, encounters, diagnoses, medications, tests, family planning, MCH)
- telehealth appointment workflows with Jitsi JaaS
- attachment/document handling
- FHIR-inspired search endpoints and bundle-style responses for interoperability

It runs as a Node.js + Express API, uses PostgreSQL via Drizzle ORM, and validates requests with Zod.

---

## 2) Why This Architecture Exists

The architecture is optimized for healthcare constraints:

- **Facility isolation by default**: every authenticated operation is scoped to a facility.
- **Person-first clinical identity**: a canonical `Person` can have clinical and auth roles (`Patient`, `User`, `Practitioner`).
- **Relational-first persistence**: domain tables remain explicit and queryable (no single JSON resource table).
- **FHIR-aligned interoperability**: FHIR-style read/search exposure without forcing strict FHIR persistence internals.
- **Incremental migration safety**: existing domain services continue to work while FHIR search layer evolves on top.
- **Auditability and security**: session lifecycle, lockout rules, refresh rotation, and audit events are first-class.

---

## 3) System Context

```text
Clients (Web / Mobile / Admin / Integrations)
        |
        v
Express API (/api/v1/*)
  - auth middleware
  - validation
  - controllers
        |
        v
Service Layer (business workflows, orchestration)
        |
        v
Repository/Data Access Layer (facility-scoped queries)
        |
        v
PostgreSQL (Drizzle schema, indexed relational model)
        |
        +--> Telehealth Integration (Jitsi JaaS + webhook sync)
```

---

## 4) Runtime Architecture (Inside the API)

```text
src/index.ts
  -> createApp() in src/app.ts
      -> global middleware (CORS, JSON parser, request logger)
      -> /docs (Swagger UI)
      -> /api/v1 router
      -> centralized error handling + structured logging

src/routes/index.ts
  -> auth, users, patients, visits, encounters, telehealth,
     family-plannings, rosters, attachments, logs, facilities, fhir...

Controller
  -> Service
      -> Repository (or Drizzle query where orchestration needs it)
          -> db (src/db/index.ts)
```

---

## 5) Core Domain Architecture

### Identity and Access Domain

- `persons`, `person_names`, `person_contacts`, `person_addresses`, `person_identifiers`
- `users`, `user_profiles`, `user_role_assignments`, `user_roles`
- `auth_sessions` for refresh token lifecycle
- `audit_events` for security/traceability

Purpose:
- separate human identity (`Person`) from operational roles (`User`, `Patient`, `Practitioner`)
- support secure login, refresh, lockout, and logout revocation

### Clinical Domain

- `patients` (clinical role linked to person)
- visits/encounters and related clinical sections
- diagnoses, medications, tests, vitals, histories
- family planning, ANC/PNC, child growth/immunization, etc.

Purpose:
- preserve feature-based relational schema
- keep domain behavior explicit and index-friendly

### Facility and Tenant Domain

- `health_facilities` and related references
- request context carries `facilityId`
- all secure operations are constrained by facility scope

Purpose:
- hard multitenancy boundaries for safety and correctness

### Interoperability Domain (FHIR Search Layer)

- `/api/v1/fhir/*` endpoints return FHIR `Bundle` payloads
- SQL-first search translation from FHIR-like query params
- shared mapper layer to generate FHIR resources from relational rows
- profile registry adds `meta.profile` for SHG-specific resource shaping

Purpose:
- interoperability for clients/integrations without rewriting storage model

---

## 6) Request Lifecycle (How a Request Flows)

```text
HTTP Request
  -> Route
  -> authMiddleware (if protected)
      - verifies JWT
      - attaches req.user and req.context (facility/user/role)
  -> Controller
      - parses/validates input
      - calls Service
  -> Service
      - business rules, orchestration, cross-module calls
  -> Repository/DB
      - relational queries
      - facility scoping
  -> Controller response
      - standard envelope for non-FHIR APIs
      - raw FHIR bundle for /fhir endpoints
```

---

## 7) Key Flows

## Flow A: Authentication + Session Lifecycle

```text
POST /auth/login
  -> verify credentials (password hash)
  -> enforce lockout/account checks
  -> resolve primary role
  -> create auth_session with refresh token hash
  -> issue access token (+ refresh token)
  -> write audit event

POST /auth/refresh
  -> validate active session by refresh token hash
  -> rotate refresh token hash
  -> issue new access token
  -> write audit event

POST /auth/logout
  -> mark session revoked
  -> write audit event
```

## Flow B: Person-First Patient Registration

```text
POST /patients
  -> validate payload (demographics, identifiers, address)
  -> create Person + names/contacts/addresses/identifiers
  -> create Patient role linked to Person
  -> create patient-specific identifiers
  -> return hydrated patient view
```

## Flow C: Clinical Encounter Capture

```text
Client submits visit/encounter updates
  -> encounter/visit services validate entity existence in same facility
  -> repositories persist encounter and linked clinical sections
     (vitals, tests, diagnoses, meds, history, etc.)
  -> retrieval endpoints compose encounter-centered response
```

## Flow D: Telehealth Booking + Join

```text
POST /telehealth/appointments
  -> validate patient + doctor + facility scope
  -> create appointment (service=telehealth)
  -> create telehealth_sessions row (provider + roomName)
  -> optional clinician notification email

POST /telehealth/appointments/:id/join?as=doctor|patient
  -> verify appointment in same facility
  -> ensure telehealth session exists
  -> generate short-lived JaaS JWT (role-sensitive)
  -> return secure joinUrl

POST /webhooks/jaas
  -> validate webhook secret
  -> dedupe event
  -> update session timings/duration analytics
```

## Flow E: FHIR Search and Aggregation

```text
GET /fhir/{ResourceType}?...
  -> parse FHIR-like query (_count, _offset, token/date filters, includes)
  -> run SQL-first projections over relational tables
  -> map rows using reusable resource mappers
  -> attach profile metadata (meta.profile)
  -> return FHIR Bundle (entry + total)
```

Implemented resources include:
- `Patient`, `Encounter`, `Observation`, `Condition`, `MedicationRequest`
- `AllergyIntolerance`, `Appointment`, `DocumentReference`
- `Organization`, `PractitionerRole`, `EpisodeOfCare`, `CarePlan`, `Immunization`

---

## 8) Data Architecture and Performance Strategy

- **Relational schema first** with domain-specific tables.
- **Targeted indexes** support high-frequency filters (`facilityId`, `patientId`, dates, source joins).
- **SQL-first filtering** is preferred over in-memory merges for FHIR search paths.
- **Profile-aware mapping layer** centralizes resource shape and prevents controller-level duplication.
- **Bundle include/revinclude support** for key patient-centric traversals.

---

## 9) Security Architecture

- JWT auth for API access.
- Facility context extracted from token and enforced in business flows.
- Refresh token hashing + rotation.
- Account lockout policy for repeated invalid logins.
- Session revocation on logout.
- Audit event logging for security-sensitive actions.
- Jitsi signing keys and webhook secrets managed via environment config.

---

## 10) Integration and API Contracts

- **Primary contract**: REST endpoints under `/api/v1`.
- **Interoperability contract**: FHIR-style search endpoints under `/api/v1/fhir`.
- **OpenAPI documentation**: route-level annotations + `/docs`.
- **Frontend compatibility**: query-friendly responses for TanStack Query patterns (pagination/filter/search).

---

## 11) Evolution Path

The project is designed for iterative modernization:

1. Preserve domain schema and business logic.
2. Improve identity/security and person-first normalization.
3. Expand SQL-first FHIR search coverage.
4. Enforce profile contracts and mapper consistency.
5. Add targeted indexes as new query paths emerge.

This keeps delivery safe for existing clients while moving toward stronger interoperability and long-term maintainability.

