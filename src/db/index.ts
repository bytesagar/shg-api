import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { baseLogger } from "../utils/logger";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  min: parseInt(process.env.DATABASE_POOL_MIN ?? "2"),
  max: parseInt(process.env.DATABASE_POOL_MAX ?? "10"),
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: true }
      : false,
});

let connectAnnounced = false;
pool.on("connect", () => {
  if (!connectAnnounced) {
    baseLogger.info("db.pool.connect");
    connectAnnounced = true;
  } else {
    baseLogger.debug("db.pool.client_acquired");
  }
});

pool.on("error", (err) => {
  baseLogger.error({ err }, "db.pool.error");
});

export const db = drizzle(pool, { schema, casing: "snake_case" });

export const closeConnection = async () => {
  await pool.end();
  baseLogger.info("db.pool.disconnect");
};
