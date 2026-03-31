---
name: "sql-filter-dsl"
description: "Builds reusable Drizzle WHERE filters using a small JSON DSL and compiles to SQL. Invoke when adding generic filtering/search to any endpoint/repository."
---

# SQL Filter DSL (Drizzle)

Use the shared filter DSL in [sql-filter.ts](file:///Users/bytesagar/smart-health-global/shg-api/src/utils/sql-filter.ts) to build reusable `WHERE` conditions for Drizzle queries.

This pattern keeps filters consistent and composable across services/repositories, while still allowing complex AND/OR logic.

## Core Types

- `SqlFilter`: a JSON-shaped filter tree
- `toSqlWhere(filter)`: compiles `SqlFilter` into `SQL | undefined`
- `andFilter(...)` / `orFilter(...)`: helpers to compose optional filters safely

## Supported Operators

- `and`, `or`
- `eq`, `ne`
- `ilike` with `mode`: `contains | starts | ends | exact`
- `inArray`
- `gt`, `gte`, `lt`, `lte`
- `isNull`, `isNotNull`
- `raw` for escape hatches (`{ raw: SQL }`)

## Recommended Usage Pattern

1. Parse request query/body into simple primitives (strings, numbers, enums).
2. Convert those primitives into a `SqlFilter` tree using `andFilter`/`orFilter`.
3. Compile once using `toSqlWhere(...)`.
4. Pass compiled `SQL` into your repository method that accepts an optional `where` clause.
5. Keep tenant isolation in the repository layer (facility scoping) and combine it with the compiled `where`.

## Example: Search + Service Filter (Patients)

```ts
import { patients } from "@/db/schema";
import { andFilter, orFilter, toSqlWhere } from "@/utils/sql-filter";

const searchString = "9800";
const service = "opd";

const filter = andFilter(
  searchString
    ? orFilter(
        { ilike: { column: patients.patientId, value: searchString } },
        { ilike: { column: patients.phoneNumber, value: searchString } },
        { ilike: { column: patients.firstName, value: searchString } },
        { ilike: { column: patients.lastName, value: searchString } },
        { ilike: { column: patients.name, value: searchString } },
      )
    : undefined,
  service
    ? { ilike: { column: patients.service, value: service, mode: "exact" } }
    : undefined,
);

const where = toSqlWhere(filter);
```

## Example: Passing Into a Facility-Scoped Repository

If your repository already enforces facility scoping (recommended), accept an optional `where?: SQL` and combine it internally with the tenant filter.

```ts
async findAll(where?: SQL) {
  return db.select().from(patients).where(this.withFacilityScope(where));
}
```

## When to Prefer `raw`

Use `raw` only for cases not covered by the DSL (advanced expressions, casts, special functions). Keep most filters in the DSL so they’re testable and consistent.

```ts
import { sql } from "drizzle-orm";

const filter = { raw: sql`date_trunc('day', ${table.createdAt}) = ${someDate}` };
```
