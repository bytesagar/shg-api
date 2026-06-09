import * as dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({ path: ".env.development", override: true });

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema/index.ts",
  dialect: "postgresql",
  casing: "snake_case",

  dbCredentials: {
    url: process.env.DATABASE_URL!,
    // ssl: true,
    // database: process.env.DATABASE_NAME!,
    // host: process.env.DATABASE_HOST!,
    // port: 5432,
    // user: process.env.DATABASE_USER!,
    // password: process.env.DATABASE_PASSWORD!,
  },
  verbose: false,
  strict: true,
});
