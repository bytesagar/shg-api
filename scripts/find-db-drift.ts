import { db, pool } from "../src/db";
import * as fs from "fs";
import * as path from "path";

interface ColumnInfo {
  table_schema: string;
  table_name: string;
  column_name: string;
  data_type: string;
}

async function main() {
  const snapshotPath = path.join(
    __dirname,
    "..",
    "drizzle",
    "meta",
    "0005_snapshot.json",
  );
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));

  const expected: Record<string, Set<string>> = {};
  for (const tableKey of Object.keys(snapshot.tables)) {
    const t = snapshot.tables[tableKey];
    const tableName: string = t.name;
    expected[tableName] = new Set(Object.keys(t.columns ?? {}));
  }

  const result = await db.execute(
    `SELECT table_schema, table_name, column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = 'public'`,
  );

  const actual: Record<string, Set<string>> = {};
  for (const row of result.rows as unknown as ColumnInfo[]) {
    if (!actual[row.table_name]) actual[row.table_name] = new Set();
    actual[row.table_name].add(row.column_name);
  }

  let driftCount = 0;
  for (const tableName of Object.keys(expected).sort()) {
    const exp = expected[tableName];
    const act = actual[tableName];
    if (!act) {
      console.log(`\n[MISSING TABLE] ${tableName}`);
      driftCount += 1;
      continue;
    }
    const missingCols = [...exp].filter((c) => !act.has(c));
    const extraCols = [...act].filter((c) => !exp.has(c));
    if (missingCols.length || extraCols.length) {
      console.log(`\n[DRIFT] ${tableName}`);
      if (missingCols.length)
        console.log(`  missing in DB: ${missingCols.join(", ")}`);
      if (extraCols.length)
        console.log(`  extra in DB:   ${extraCols.join(", ")}`);
      driftCount += 1;
    }
  }

  for (const tableName of Object.keys(actual).sort()) {
    if (!expected[tableName] && tableName !== "journal") {
      console.log(`\n[EXTRA TABLE in DB only] ${tableName}`);
      driftCount += 1;
    }
  }

  const enumExpected = new Set<string>(Object.keys(snapshot.enums ?? {}));
  const enumActual = await db.execute(
    `SELECT typname FROM pg_type WHERE typcategory='E' AND typnamespace=(SELECT oid FROM pg_namespace WHERE nspname='public')`,
  );
  const enumActualSet = new Set(
    (enumActual.rows as unknown as { typname: string }[]).map((r) => r.typname),
  );
  const enumExpectedNames = new Set<string>();
  for (const k of enumExpected) {
    const e = snapshot.enums[k];
    enumExpectedNames.add(e.name);
  }
  const missingEnums = [...enumExpectedNames].filter((e) => !enumActualSet.has(e));
  if (missingEnums.length) {
    console.log(`\n[MISSING ENUMS] ${missingEnums.join(", ")}`);
    driftCount += missingEnums.length;
  }

  console.log(`\n---\nTotal drift items: ${driftCount}`);
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end().catch(() => {});
  process.exit(1);
});
