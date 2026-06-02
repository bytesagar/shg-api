import { eq } from "drizzle-orm";

import { db } from "../db";
import { migration_id_map } from "../db/schema";

/**
 * The linchpin of the migration: a bidirectional registry mapping every v1
 * integer primary key to the v2 uuid it became, so foreign keys can be
 * rewired across the structural gap between the two schemas.
 *
 * Backed by the `migration_id_map` table (persistent => idempotent &
 * resumable), with an in-memory cache so FK lookups during a run are O(1) and
 * don't round-trip the DB. On a `--dry-run` we keep the cache but never write
 * the table, so transforms still resolve within the run without leaving state.
 *
 * Entity keys are short constants chosen per step, e.g. "patient", "user",
 * "facility", "province", "district", "municipality", "encounter", "visit",
 * "pregnancy", "family_planning", ...
 */
export class IdMap {
  // entity -> (v1Id -> v2Uuid)
  private cache = new Map<string, Map<number, string>>();

  constructor(private readonly dryRun: boolean) {}

  /** Load every existing mapping into memory (called once at run start). */
  async preload(): Promise<void> {
    const rows = await db
      .select({
        entity: migration_id_map.entity,
        v1Id: migration_id_map.v1Id,
        v2Id: migration_id_map.v2Id,
      })
      .from(migration_id_map);
    for (const r of rows) this.bucket(r.entity).set(Number(r.v1Id), r.v2Id);
  }

  private bucket(entity: string): Map<number, string> {
    let m = this.cache.get(entity);
    if (!m) {
      m = new Map();
      this.cache.set(entity, m);
    }
    return m;
  }

  get(entity: string, v1Id: number | null | undefined): string | undefined {
    if (v1Id == null) return undefined;
    return this.cache.get(entity)?.get(Number(v1Id));
  }

  has(entity: string, v1Id: number | null | undefined): boolean {
    return this.get(entity, v1Id) !== undefined;
  }

  /** Record one mapping (cache always; table unless dry-run). */
  async set(entity: string, v1Id: number, v2Id: string): Promise<void> {
    this.bucket(entity).set(Number(v1Id), v2Id);
    if (this.dryRun) return;
    await db
      .insert(migration_id_map)
      .values({ entity, v1Id, v2Id })
      .onConflictDoNothing();
  }

  /** Record many mappings in one statement. */
  async setMany(
    entity: string,
    pairs: Array<{ v1Id: number; v2Id: string }>,
  ): Promise<void> {
    if (pairs.length === 0) return;
    const b = this.bucket(entity);
    for (const p of pairs) b.set(Number(p.v1Id), p.v2Id);
    if (this.dryRun) return;
    await db
      .insert(migration_id_map)
      .values(pairs.map((p) => ({ entity, v1Id: p.v1Id, v2Id: p.v2Id })))
      .onConflictDoNothing();
  }

  /** Count of mapped rows for an entity (for the report / resumability). */
  count(entity: string): number {
    return this.cache.get(entity)?.size ?? 0;
  }

  /** Remove all mappings for an entity (used by --reset for a single step). */
  async clearEntity(entity: string): Promise<void> {
    this.cache.delete(entity);
    if (this.dryRun) return;
    await db.delete(migration_id_map).where(eq(migration_id_map.entity, entity));
  }
}
