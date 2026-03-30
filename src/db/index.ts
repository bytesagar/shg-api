import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Logging connection status
pool.on("connect", () => {
  console.log("✅ Database connected successfully");
});

pool.on("error", (err) => {
  console.error("❌ Database connection error:", err);
});

export const db = drizzle(pool, { schema, casing: "snake_case" });

// To handle disconnection logging, we can check for pool end
export const closeConnection = async () => {
  await pool.end();
  console.log("🔌 Database disconnected");
};
