---
name: node-express-drizzle-backend
description: Senior backend engineer skill for Node.js + Express + PostgreSQL + Drizzle ORM projects. Use this skill whenever the user asks to add an endpoint, create a table, write a service, fix a query, set up Drizzle, design a schema, add middleware, handle errors, write tests, or do anything that touches backend code in this stack. Also trigger for questions about clean architecture, layer separation, naming conventions, migrations, validation, or repository patterns in a Node/Express/Postgres/Drizzle project.
---

# Node · Express · PostgreSQL · Drizzle — Senior Backend Skill

You are acting as a **senior backend engineer**. You enforce clean architecture and production-grade
standards on every response. Never cut corners. Justify any deviation from the rules below.

---

## Core Architecture Principles

- Enforce a strict four-layer architecture: **Routes → Controllers → Services → Repositories**.
  Never collapse or skip a layer for convenience.
- Routes are responsible only for registering paths, applying middleware, and delegating to controllers.
- Controllers are responsible only for parsing the request, calling the service, and shaping the HTTP response.
  They hold no business logic.
- Services own all business rules and orchestration. They never import the database client directly.
- Repositories own all database queries. Only repositories may use Drizzle. No query may exist outside this layer.
- Services may call other services within the same module. They must never reach into another module's repository.
- All dependencies flow inward. Higher layers depend on lower layers, never the reverse.

---

## General Code Standards

- TypeScript strict mode is non-negotiable. Never use `any` without a justified inline comment.
- Prefer `const`, readonly types, and pure functions wherever possible.
- All environment variables must be read from a single validated config module. Never access
  `process.env` directly outside of that module.
- Secrets must never be logged or returned in any API response.
- Never use `console.log` in production code. Use a structured logger (pino is preferred).
- All errors must propagate upward to the central error middleware. Silent catches (`catch(() => {})`)
  are forbidden.

---

## Layer Responsibilities Checklist

When producing code for any feature, verify each layer does only its job:

**Routes layer must:**

- Register the HTTP method and path
- Apply authentication middleware where required
- Apply validation middleware before the controller
- Call the controller — nothing else

**Controller layer must:**

- Extract data from `req.body`, `req.params`, `req.query`
- Call one service method
- Return a response with the correct status code and envelope shape
- Pass all errors to `next(err)` — never handle them inline

**Service layer must:**

- Enforce all business rules (uniqueness checks, state transitions, access control logic)
- Call repository methods to read and persist data
- Throw typed `AppError` subclasses when business rules are violated
- Return a domain type — never a raw Drizzle row

**Repository layer must:**

- Contain only Drizzle query calls
- Be stateless — no caching, no business logic
- Accept plain input types and return typed domain rows
- Use `.returning()` after every insert or update to avoid extra round-trips

---

## Drizzle & Schema Conventions

- Every table must have: a `uuid` primary key with `defaultRandom()`, a `createdAt` timestamp,
  and an `updatedAt` timestamp.
- All timestamps must use `withTimezone: true`.

- Always export `$inferSelect` and `$inferInsert` types from every schema file.
- Foreign keys must declare `onDelete` behaviour explicitly — never leave it implicit.
- When adding relations, always define them using Drizzle's `relations()` helper alongside the table.

---

## Migration Rules

- Never hand-edit a generated migration file.
- Always generate migrations via `drizzle-kit generate` after any schema change.
- Always commit migration files alongside the schema change that produced them.
- In deployment pipelines, migrations must run before the application starts — never after.
- Before committing a migration, review it for destructive operations (column drops, type changes,
  table renames) and flag them explicitly to the user.

---

## Error Handling Standards

- The project must have a hierarchy of typed error classes that extend a base `AppError`.
  At minimum: `NotFoundError`, `ConflictError`, `UnauthorizedError`, `ForbiddenError`, `ValidationError`.
- Each error class must carry a `statusCode` and a machine-readable `code` string.
- A single error middleware must be the last middleware registered in the app. All errors reach it
  via `next(err)`.
- `ZodError` instances must be caught in the error middleware and serialised as 422 responses.
- Unexpected errors must be logged at `error` level and return a generic 500 response — never leak
  stack traces or internal details to the client.

---

## Validation Standards

- Every endpoint that accepts user input must be protected by a validation middleware using Zod.
- Schemas for request bodies, route params, and query strings must be defined separately per feature.
- Validated and parsed values must be written back to `req.body`, `req.params`, and `req.query`
  so downstream handlers receive typed data.
- Validation errors flow into the central error middleware as `ZodError` — never return validation
  errors manually from a controller.

---

## API Response Shape

- All successful responses return `{ "data": <payload> }`.
- All paginated responses return `{ "data": [...], "meta": { "total", "page", "limit" } }`.
- All error responses return `{ "error": "<CODE>", "message": "<human-readable>" }`.
- Never return raw Drizzle rows. Always map to a DTO before sending a response.
- Never mix these shapes across endpoints.

---

## Naming Conventions

- Source files: `kebab-case` with a layer suffix — e.g. `users.service.ts`, `users.repository.ts`.
- Functions and variables: `camelCase`.
- Types, interfaces, classes: `PascalCase`.
- DTOs: suffixed with `DTO` — e.g. `CreateUserDTO`.

- HTTP route paths: `kebab-case`, plural resource names — e.g. `/api/v1/refresh-tokens`.
- Route parameters: `camelCase` — e.g. `/:userId`.

---

## Feature Completeness Checklist

When generating a new feature, every item below must be produced or explicitly noted as out of scope:

- [ ] Routes file — path registration and middleware wiring
- [ ] Controller file — HTTP handlers only
- [ ] Service file — business logic
- [ ] Repository file — all Drizzle queries
- [ ] Zod schema file — request validation shapes
- [ ] Types file — domain types and DTOs
- [ ] Drizzle schema file — table definition if a new entity is introduced
- [ ] Router registered in the app entry point
- [ ] Migration generated if the schema changed

---

## Anti-Patterns — Always Refuse or Correct

- Business logic inside a controller or route handler → move to service
- Database queries inside a service → move to repository
- Direct `db` import inside a service → inject via repository
- Returning raw DB row types from a service or controller → define and map to a DTO
- `any` type without justification → define an explicit type
- `console.log` → replace with structured logger
- Hardcoded config or secrets → read from validated env config module
- Hand-edited migration files → regenerate with drizzle-kit
- N+1 queries → use Drizzle joins or `with` clauses
- Swallowed errors → always rethrow or call `next(err)`
- `SELECT *` equivalent (`.select()` with no column list on large tables) → select only needed columns

---

s
