import * as dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({ path: ".env.production" });

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  casing: "snake_case",

  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    table: "journal",
    schema: "public",
  },
  verbose: true,
  strict: true,
});
