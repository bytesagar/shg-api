/**
 * Standalone entrypoint — `yarn db:seed:lab-orders` calls this directly so the
 * demo worklist can be seeded independently of the main `seed.ts` loader.
 */
import "dotenv/config";

import { seedLabOrders } from "./seed-lab-orders";

async function main(): Promise<void> {
  const summary = await seedLabOrders();
  if (summary.skipped) {
    console.log("[seed-lab-orders] skipped (already seeded or no patients)");
  } else {
    console.log(
      `[seed-lab-orders] ${summary.inserted} order(s) inserted for facility ${summary.facilityId}`,
    );
  }
}

void main().then(
  () => {
    process.exit(0);
  },
  (err: unknown) => {
    console.error("[seed-lab-orders] failed:", err);
    process.exit(1);
  },
);
