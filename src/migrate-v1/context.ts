import { randomUUID } from "crypto";

import { eq } from "drizzle-orm";

import { db } from "../db";
import { persons, users } from "../db/schema";
import { IdMap } from "./id-map";
import { MigrationReport } from "./report";

/**
 * Shared state threaded through every migration step.
 */
export interface MigrationContext {
  dryRun: boolean;
  idMap: IdMap;
  report: MigrationReport;
  batchSize: number;
  /**
   * The "v1-migration" fallback user. Any audit FK (createdBy/updatedBy/
   * deletedBy/doctorId/...) whose v1 reference can't be resolved through the
   * user id-map lands here, so v2 NOT NULL audit columns are satisfied and the
   * fallback is visible in the report.
   */
  systemUserId: string;
  systemPersonId: string;
}

/**
 * One ordered phase of the migration. `key` is the short name used by
 * `--only=` / `--reset=`; steps run strictly in registry order so every FK
 * target exists before it is referenced.
 */
export interface MigrationStep {
  key: string;
  title: string;
  run(ctx: MigrationContext): Promise<void>;
}

/** Sentinel email/identity for the synthetic migration user. */
const SYSTEM_USER_EMAIL = "v1-migration@system.local";

/**
 * Ensure the synthetic "v1-migration" system user exists and return its ids.
 * Idempotent: reuses the row if a prior run created it. On a dry-run we don't
 * touch the DB — we hand back placeholder uuids (FKs aren't persisted anyway).
 */
export async function bootstrapSystemUser(
  dryRun: boolean,
): Promise<{ systemUserId: string; systemPersonId: string }> {
  if (dryRun) {
    return { systemUserId: randomUUID(), systemPersonId: randomUUID() };
  }

  const existing = await db
    .select({ id: users.id, personId: users.personId })
    .from(users)
    .where(eq(users.email, SYSTEM_USER_EMAIL))
    .limit(1);
  if (existing.length) {
    return {
      systemUserId: existing[0].id,
      systemPersonId: existing[0].personId,
    };
  }

  const [person] = await db
    .insert(persons)
    .values({ status: "active" })
    .returning({ id: persons.id });

  const [user] = await db
    .insert(users)
    .values({
      email: SYSTEM_USER_EMAIL,
      personId: person.id,
      firstName: "v1",
      lastName: "migration",
      // Unusable hash — this account is never meant to log in.
      passwordHash: `!migration!${randomUUID()}`,
      accountStatus: "inactive",
      userType: "admin",
      phoneNumber: "+9779800000000",
    })
    .returning({ id: users.id });

  return { systemUserId: user.id, systemPersonId: person.id };
}

/**
 * Resolve a v1 audit/actor FK to a v2 user uuid, falling back to the system
 * user (and recording the fallback) when the reference can't be mapped.
 */
export function resolveUserFk(
  ctx: MigrationContext,
  entity: string,
  v1RowId: number,
  column: string,
  v1UserId: number | null | undefined,
): string {
  if (v1UserId == null) return ctx.systemUserId;
  const mapped = ctx.idMap.get("user", v1UserId);
  if (mapped) return mapped;
  ctx.report.recordFkFallback(entity, v1RowId, column, Number(v1UserId));
  return ctx.systemUserId;
}
