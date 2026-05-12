import * as dotenv from "dotenv";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from ".";

dotenv.config({
  path:
    process.env.NODE_ENV === "production"
      ? ".env.production"
      : ".env.development",
});

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  console.log("Running migrations...");

  await migrate(db, {
    migrationsFolder: "./drizzle",
    migrationsTable: "journal",
    migrationsSchema: "public",
  });

  console.log("✅ Migrations complete");
  await pool.end();
}

main().catch(async (err) => {
  console.error("❌ Migration failed:", err);
  await pool.end().catch(() => {});
  process.exit(1);
});
