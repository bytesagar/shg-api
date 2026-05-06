import * as dotenv from "dotenv";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from ".";
// Load env first before anything else
dotenv.config({
  path:
    process.env.NODE_ENV === "production"
      ? ".env.production"
      : ".env.development",
  override: true,
});

async function main() {
  console.log("Running migrations...");

  await migrate(db, { migrationsFolder: "./drizzle" });

  console.log("✅ Migrations complete");
  await pool.end();
}

main();
