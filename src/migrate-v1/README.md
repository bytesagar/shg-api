# v1 → v2 data migration runbook

Moves **all portable data** from the legacy v1 app (`shg-webapp`, Prisma + Postgres,
`int` primary keys) into this v2 app (`shg-api`, Drizzle + Postgres, `uuid` primary
keys). The two schemas are structurally incompatible, so this is an ETL transform —
not a `pg_dump | psql` restore.

What it does, at a glance:

- Reads v1 over the raw **`pg`** driver (`V1_DATABASE_URL`) and writes v2 with the
  existing **Drizzle** client (`DATABASE_URL`). No Prisma dependency in v2.
- Explodes the flat v1 `Patient` into the normalized `persons` + `person_*` →
  `patients` model; splits each v1 `Encounter` into a `visits` **and** an
  `encounters` row; rewires every `int` foreign key to its new `uuid` through a
  persistent **`migration_id_map`** table.
- Is **idempotent and resumable**: every inserted row records its `v1_id → v2_id`
  mapping, so a re-run skips what's already migrated and a crashed run can be
  restarted.

## Prerequisites

1. **A v2 database with the schema applied.** Run `yarn db:migrate` first. The
   `migration_id_map` bookkeeping table is part of the schema.
2. **A reachable v1 source.** Strongly prefer a **restored dump** over the live
   production DB (safe, repeatable, offline). See below.
3. **Geography is seeded in v2.** Step 01 *matches* provinces/districts/
   municipalities by official `code`; it does not insert them. Run `yarn db:seed`
   (or `seedGeography()`) on the v2 DB beforehand, or step 01 will abort listing
   unmatched codes.

## 1. Take a v1 dump and restore it locally

```bash
# On a machine that can reach v1 production (read-only):
pg_dump --no-owner --no-privileges -Fc -d "$V1_PROD_URL" -f shg_v1.dump

# Restore into a throwaway local Postgres (example: a dedicated PG17 container):
docker run -d --name shg-v1-pg -e POSTGRES_PASSWORD=password -p 5433:5432 postgres:17
createdb -h localhost -p 5433 -U postgres shg_v1     # or: docker exec ... createdb
pg_restore --no-owner --no-privileges -h localhost -p 5433 -U postgres \
  -d shg_v1 shg_v1.dump
```

A frozen snapshot means every dry-run sees identical input, so you can iterate on
mappings until the counts reconcile.

## 2. Configure connections

Both URLs live in the env file the app loads for the chosen `NODE_ENV`
(`.env.development` by default — `src/index.ts` / `src/db/migrate.ts` pick the file).

```ini
DATABASE_URL=postgres://...        # v2 target (e.g. local dev DB)
V1_DATABASE_URL=postgres://postgres:password@localhost:5433/shg_v1   # v1 source
```

Whether `V1_DATABASE_URL` points at a restored dump or a live DB is invisible to the
tool — the runbook assumes a restore.

## 3. Dry-run, inspect, repeat

```bash
yarn migrate:v1 --dry-run
```

A dry-run runs every transform and prints the reconciliation report **without
writing** (it registers synthetic ids in-memory so downstream steps can still
resolve FKs). Inspect the report for:

- **`failed > 0`** on any entity — a missing FK target (the warning lines name the
  offending rows).
- **Unmapped enum values** — surfaced as warnings; add the value to the relevant
  map in `enums.ts` and re-run.
- **Unmatched geography codes** — step 01 aborts; reconcile the v2 geography seed.
- **Audit FK fallbacks** — `createdBy/updatedBy/deletedBy/...` that didn't resolve
  to a migrated user fall back to the seeded **`v1-migration` system user** and are
  counted. A small number is expected (orphaned v1 audit ids).

Iterate until the report is clean (`failed=0`, no unexpected unmapped enums).

## 4. Real run

```bash
yarn migrate:v1
```

Runs all steps in dependency order inside per-row/per-batch transactions, persisting
the id-map as it goes. Exit code is non-zero if any entity had failures.

### Useful flags

| Flag | Effect |
|---|---|
| `--dry-run` | Transform + report, no writes. |
| `--only=patients,maternal` | Run only the named **steps** (keys below). |
| `--reset=patient,visit` | Delete those **entity** id-map rows before running (forces re-insert). |
| `--batch=1000` | Read/insert batch size (default 500). |

**Step keys** (for `--only`), in run order:
`geography, facilities, users, patients, encounters, clinical, maternal,
immunization, family_planning, comms`.

> `--reset` takes **entity** keys (`patient`, `visit`, `encounter`, `vital`,
> `appointment`, …), not step keys — it only clears id-map entries, it does **not**
> delete already-inserted v2 rows. Use it to re-run a step against a fresh/empty v2
> DB, or pair it with a manual cleanup of the target rows; otherwise re-inserting
> may create duplicates for tables without a natural-key guard.

## 5. Verify

1. **Counts reconcile.** The report's `v1` vs `inserted` columns should match per
   entity (`visit` = `encounter` = v1 `Encounter` count; `patient` ≈ v1 `Patient`;
   etc.).
2. **Spot-check 5–10 patients end-to-end** via the API (`GET /api/v1/patients/:id`,
   list/search): name/phone/address/identifiers exploded correctly into `person_*`;
   their encounters, vitals, diagnoses, meds, pregnancies/ANC, immunizations, family
   planning all attached with correct dates.
3. **A migrated user can reset password and log in.** Passwords are **not**
   transferred — every migrated user gets a random hash + a `password_resets` token
   and must reset on first login.
4. **Re-run idempotency.** Run `yarn migrate:v1` a second time → the report shows
   ~0 new inserts (everything skipped via the id-map), no duplicate-key errors.

## Running against production (Dokploy)

This is a one-way ETL into a **freshly stood-up v2 prod database**, not an in-place
upgrade. "Migrating in prod" just means pointing the tool's two connections at a v1
**source** (a restored snapshot) and your v2 **production** DB as the write target.

> **Env gotcha:** `index.ts` does `import "dotenv/config"`, so the migration reads a
> plain **`.env`** file (or real environment variables) — **not** `.env.production`.
> Set `DATABASE_URL` / `V1_DATABASE_URL` in `.env` (or export them) on whatever host
> runs the script. (`yarn db:migrate`, by contrast, *does* honour `NODE_ENV` and loads
> `.env.production`.)
>
> **devDeps gotcha:** `migrate:v1` runs via **`ts-node` + devDependencies** — there is
> no compiled build for it. Dokploy app images built with `yarn install --production`
> strip devDeps, so `ts-node` won't exist there. Run from a checkout with a **full
> `yarn install`** (laptop, bastion, or a temporary node container on the server).

### Rehearse first, then run for real

Do a full **dress-rehearsal into a throwaway/empty v2 DB** before touching prod: point
`DATABASE_URL` at the scratch DB, run `db:migrate` → seed → `migrate:v1`, and shake out
unmapped enums / geography mismatches / the reconciliation report there. Once that run
is clean, repeat the **identical** steps against the real prod DB.

### Reaching the Dokploy Postgres — pick one

- **Best (lowest latency, most secure): run on the server.** A short-lived node
  container (or `docker exec` into one) with the repo + full devDeps, on the **same
  Docker network** as the Postgres service. `DATABASE_URL` uses the **internal** service
  hostname — no port exposure, fast writes. Restore the v1 dump somewhere reachable from
  that container.
- **From your laptop via SSH tunnel** (do **not** publicly expose port 5432):
  ```bash
  # forward local 5544 -> the server's postgres
  ssh -N -L 5544:localhost:5432 user@your-dokploy-host
  # .env on the laptop:
  DATABASE_URL=postgres://<user>:<pass>@localhost:5544/<v2_prod_db>   # write target
  V1_DATABASE_URL=postgres://postgres:password@localhost:5433/shg_v1  # local v1 restore
  ```
  Restore the v1 snapshot locally (the `:5433` container above) so reads are local and
  only v2 **writes** cross the tunnel. Fine for clinic-scale data; for very large sets,
  prefer running on the server.

### Prod run order

1. **Backup the v2 prod DB** first: `pg_dump -Fc -d "$V2_PROD_URL" -f v2_pre_migration.dump`
   (your rollback). Freeze writes to v2 during the window.
2. **Apply schema + reference seed to prod** (these honour `NODE_ENV`):
   `NODE_ENV=production yarn db:migrate` then `yarn db:seed:prod` (geography must be
   seeded — step 01 aborts on unmatched codes).
3. **Point `.env` at prod** (see the gotcha above) and **dry-run**: `yarn migrate:v1 --dry-run`
   until the report is clean.
4. **Real run:** `yarn migrate:v1`. Re-run on crash — it resumes via the id-map.
5. **Verify** per §5; unfreeze writes.

### Attachments / S3

DB rows (name + path) migrate regardless. When v2 prod uses the **same S3 bucket** as
v1, the objects are already reachable — **no copy job needed**. Only a bucket change
requires copying the underlying S3 objects as a separate task.

## Architecture

```
src/migrate-v1/
  index.ts        # CLI entrypoint: parses flags, opens both DBs, runs steps, prints report
  v1-client.ts    # pg Pool + v1Query / v1Batches (keyset-paginated raw-SQL reads)
  id-map.ts       # persistent int(v1) -> uuid(v2) registry (migration_id_map table)
  context.ts      # MigrationContext, resolveUserFk (audit-FK rewiring), system-user bootstrap
  report.ts       # reconciliation report (counts, fallbacks, warnings)
  enums.ts        # explicit value maps (gender, caste, service, statuses, FP devices, …)
  steps/
    01-geography.ts       06-clinical.ts
    02-facilities.ts      07-maternal.ts
    03-roles-users.ts     08-immunization.ts
    04-patients.ts        09-family-planning.ts
    05-encounters.ts      10-comms.ts
```

Steps run strictly in numbered order so every FK target exists before it is
referenced. Within a step, parents are inserted before children.

### `v1Batches` gotcha (keyset pagination)

`v1Batches(table, idCol, batchSize, selectCols)` paginates by reading the **last
row's `idCol`** to fetch the next page. The returned row key is the *unqualified*
column name, so a `JOIN` whose `idCol` is qualified (e.g. `t.id`) breaks pagination.
When a step needs a column from a related v1 table, **preload it into a `Map` via
`v1Query`** rather than joining (see `08-immunization.ts` / the `sms_log` facility
back-fill in `10-comms.ts`).

## Out of scope / notes

- **IMNCI** — v1 has none; v2 IMNCI tables stay empty.
- **Telehealth/JaaS session history, auth sessions** — operational/ephemeral, not
  migrated. Only `appointments` carry over (their telehealth-specific columns are
  dropped).
- **Document/attachment S3 objects** — DB rows (name + path) migrate; copying the
  underlying S3 objects to a new bucket is a separate job if the bucket changes.
- **Passwords** — not transferred; all migrated users must reset.
- **Derived birth dates** — v1 rows with `age` but no `dob` get an approximate
  `birthDate`, surfaced in the report for review.
- **Family planning** — v1 FP rows have no visit/encounter; the migration
  synthesizes one `visits` + one `encounters` row per FP card to satisfy v2's NOT
  NULL links (mirroring how the v2 create-service behaves).
```
