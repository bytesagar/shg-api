import { db } from "../db";
import { patients } from "../db/schema";
import { count } from "drizzle-orm";

/**
 * Generates a unique patient ID.
 * Format: SHG-YEAR-COUNT
 */
export async function generatePatientId(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const result = await db.select({ count: count() }).from(patients);
  const nextCount = Number(result[0].count) + 1;
  const paddedCount = nextCount.toString().padStart(5, "0");
  return `SHG-${currentYear}-${paddedCount}`;
}
