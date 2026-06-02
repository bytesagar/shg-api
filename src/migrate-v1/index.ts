/**
 * v1 (shg-webapp / Prisma) -> v2 (shg-api / Drizzle) data migration.
 *
 * A standalone, idempotent, ordered ETL. Reads v1 over the raw `pg` driver
 * (V1_DATABASE_URL — point it at a restored snapshot) and writes v2 with the
 * existing Drizzle client (DATABASE_URL). See README.md in this folder for the
 * dump -> restore -> dry-run -> verify -> real-run runbook.
 *
 * Usage:
 *   yarn migrate:v1 --dry-run                 # transform + report, no writes
 *   yarn migrate:v1                           # real run (all steps)
 *   yarn migrate:v1 --only=patients,maternal  # re-run specific steps
 *   yarn migrate:v1 --reset=patients          # drop those steps' id-map first
 *   yarn migrate:v1 --batch=1000              # batch size (default 500)
 */
import "dotenv/config";

import { closeConnection } from "../db";
import { logger } from "../utils/logger";
import {
  bootstrapSystemUser,
  type MigrationContext,
  type MigrationStep,
} from "./context";
import { IdMap } from "./id-map";
import { MigrationReport } from "./report";
import { STEPS } from "./steps";
import { closeV1Pool, getV1Pool } from "./v1-client";

interface CliOptions {
  dryRun: boolean;
  only: string[] | null;
  reset: string[];
  batchSize: number;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    dryRun: false,
    only: null,
    reset: [],
    batchSize: 500,
  };
  for (const arg of argv) {
    if (arg === "--dry-run") opts.dryRun = true;
    else if (arg.startsWith("--only="))
      opts.only = arg
        .slice("--only=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    else if (arg.startsWith("--reset="))
      opts.reset = arg
        .slice("--reset=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    else if (arg.startsWith("--batch="))
      opts.batchSize = Math.max(1, parseInt(arg.slice("--batch=".length), 10) || 500);
  }
  return opts;
}

function selectSteps(opts: CliOptions): MigrationStep[] {
  if (!opts.only) return STEPS;
  const wanted = new Set(opts.only);
  const selected = STEPS.filter((s) => wanted.has(s.key));
  const unknown = [...wanted].filter((k) => !STEPS.some((s) => s.key === k));
  if (unknown.length) {
    throw new Error(
      `Unknown --only step(s): ${unknown.join(", ")}. ` +
        `Valid keys: ${STEPS.map((s) => s.key).join(", ")}`,
    );
  }
  return selected;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  logger.info("migrate_v1.start", {
    dryRun: opts.dryRun,
    only: opts.only,
    reset: opts.reset,
    batchSize: opts.batchSize,
  });

  // Fail fast if V1 isn't reachable before we touch v2.
  await getV1Pool().query("SELECT 1");

  const report = new MigrationReport();
  const idMap = new IdMap(opts.dryRun);
  await idMap.preload();

  // --reset clears id-map rows for the named steps so they re-insert cleanly.
  for (const key of opts.reset) {
    await idMap.clearEntity(key);
    logger.warn("migrate_v1.reset_entity", { entity: key });
  }

  const { systemUserId, systemPersonId } = await bootstrapSystemUser(opts.dryRun);

  const ctx: MigrationContext = {
    dryRun: opts.dryRun,
    idMap,
    report,
    batchSize: opts.batchSize,
    systemUserId,
    systemPersonId,
  };

  const steps = selectSteps(opts);
  for (const step of steps) {
    const startedAt = Date.now();
    logger.info("migrate_v1.step_start", { step: step.key, title: step.title });
    try {
      await step.run(ctx);
    } catch (err) {
      logger.error("migrate_v1.step_failed", { step: step.key, err });
      report.warn(`step "${step.key}" threw: ${(err as Error).message}`);
      throw err;
    }
    logger.info("migrate_v1.step_done", {
      step: step.key,
      ms: Date.now() - startedAt,
    });
  }

  const { totalFailed } = report.print({ dryRun: opts.dryRun });
  return totalFailed;
}

main()
  .then(async (totalFailed) => {
    await closeV1Pool();
    await closeConnection();
    process.exit(totalFailed > 0 ? 1 : 0);
  })
  .catch(async (err) => {
    logger.error("migrate_v1.fatal", { err });
    await closeV1Pool().catch(() => undefined);
    await closeConnection().catch(() => undefined);
    process.exit(1);
  });
