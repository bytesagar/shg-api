import { db } from "./src/db";
import { sql } from "drizzle-orm";

async function cleanupEnums() {
  console.log("Cleaning up status columns for enums...");
  try {
    // Patients
    await db.execute(sql`UPDATE patients SET status = 'active' WHERE LOWER(status) = 'active' OR status IS NULL`);
    
    // Encounters
    await db.execute(sql`UPDATE encounters SET status = 'finished' WHERE LOWER(status) = 'active' OR status IS NULL`);
    await db.execute(sql`UPDATE encounters SET status = 'planned' WHERE status NOT IN ('planned', 'arrived', 'in_progress', 'finished', 'cancelled') OR status IS NULL`);

    // Call Requests
    await db.execute(sql`UPDATE call_requests SET status = 'pending' WHERE status NOT IN ('pending', 'accepted', 'declined', 'completed') OR status IS NULL`);

    // Appointments
    await db.execute(sql`UPDATE appointments SET status = 'scheduled' WHERE status NOT IN ('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show') OR status IS NULL`);

    console.log("Cleanup completed.");
  } catch (error) {
    console.error("Cleanup failed:", error);
  } finally {
    process.exit(0);
  }
}

cleanupEnums();
