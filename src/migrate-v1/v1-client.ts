import { Pool } from "pg";

/**
 * Read-only connection to the v1 (shg-webapp / Prisma) Postgres database.
 *
 * The migration reads v1 over the raw `pg` driver — no Prisma dependency in
 * v2. Point `V1_DATABASE_URL` at either the live v1 DB or (recommended) a
 * locally-restored `pg_dump` snapshot; the code can't tell the difference.
 *
 * NOTE: v1 was authored with Prisma using PascalCase model names that map to
 * mixed-case physical tables (e.g. `"Patient"`, `"Encounter"`, but snake_case
 * `vital`, `complaint`). Always quote identifiers exactly in read SQL.
 */
let pool: Pool | null = null;

export function getV1Pool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.V1_DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "V1_DATABASE_URL is not set. Point it at the restored v1 snapshot, " +
        "e.g. postgres://postgres:password@localhost:5433/shg_v1",
    );
  }

  pool = new Pool({
    connectionString,
    // Reads only; a small pool is plenty and avoids hammering the source.
    max: parseInt(process.env.V1_DATABASE_POOL_MAX ?? "4"),
    // A restored snapshot is local/plaintext; never force TLS here.
    ssl: process.env.V1_DATABASE_SSL === "true"
      ? { rejectUnauthorized: false }
      : false,
  });

  return pool;
}

/** Run a read query against v1 and return typed rows. */
export async function v1Query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await getV1Pool().query(sql, params);
  return res.rows as T[];
}

/** Count rows in a v1 table (identifier must be a trusted constant). */
export async function v1Count(tableIdent: string): Promise<number> {
  const res = await getV1Pool().query<{ count: string }>(
    `SELECT count(*)::text AS count FROM ${tableIdent}`,
  );
  return Number(res.rows[0]?.count ?? 0);
}

/**
 * Stream a v1 table in id-ordered batches so we never hold a 30k-row table in
 * memory at once. `tableIdent` and `idCol` must be trusted constants supplied
 * by the migration steps (never user input).
 */
export async function* v1Batches<T = Record<string, unknown>>(
  tableIdent: string,
  idCol: string,
  batchSize = 500,
  selectCols = "*",
): AsyncGenerator<T[]> {
  let lastId = -1;
  for (;;) {
    const rows = await v1Query<T>(
      `SELECT ${selectCols} FROM ${tableIdent}
       WHERE ${idCol} > $1
       ORDER BY ${idCol} ASC
       LIMIT ${batchSize}`,
      [lastId],
    );
    if (rows.length === 0) break;
    yield rows;
    const last = rows[rows.length - 1] as Record<string, unknown>;
    lastId = Number(last[idCol]);
  }
}

export async function closeV1Pool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
