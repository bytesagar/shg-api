/**
 * Standalone entrypoint — `yarn seed:lab-tests` calls this directly so
 * the catalog can be re-seeded independently of the main `seed.ts`
 * fixture loader.
 */
import "dotenv/config";

import { seedLabTests } from "./seed-lab-tests";

async function main(): Promise<void> {
    const summary = await seedLabTests();
    console.log(
        `[seed-lab-tests] ${summary.inserted} inserted, ${summary.skipped} already present, ${summary.total} total`,
    );
}

void main().then(
    () => {
        process.exit(0);
    },
    (err: unknown) => {
        console.error("[seed-lab-tests] failed:", err);
        process.exit(1);
    },
);
