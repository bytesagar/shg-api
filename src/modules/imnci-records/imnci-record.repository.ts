import { and, desc, eq, isNull, sql, SQL } from "drizzle-orm";

import { db } from "@/db";
import { imnci_records } from "@/db/schema";
import { FacilityContext } from "@/context/facility-context";
import { FacilityRepository } from "@/core/facility-repository";

import type { ImnciRecordUpsertInput } from "./imnci-record.validation";

export interface ImnciRecordListFilters {
  patientId?: string;
  ageBand?: "under-2-months" | "2-months-to-5-years";
  page: number;
  pageSize: number;
}

export class ImnciRecordRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, imnci_records.facilityId);
  }

  /**
   * Upsert on the client-generated id. Re-syncing the same record after
   * a clinician edit overwrites the row; a fresh record from a new
   * sheet open inserts. Soft-deleted rows are revived by a re-sync —
   * the client is the source of truth for offline-first.
   */
  public async upsert(
    input: ImnciRecordUpsertInput,
    actorUserId: string | null,
  ) {
    const [row] = await db
      .insert(imnci_records)
      .values({
        id: input.id,
        facilityId: this.context.facilityId,
        patientId: input.patientId,
        visitId: input.visitId ?? null,
        encounterId: input.encounterId ?? null,
        ageBand: input.ageBand,
        values: input.values,
        clientCreatedAt: new Date(input.clientCreatedAt),
        clientUpdatedAt: new Date(input.clientUpdatedAt),
        createdByUserId: actorUserId,
      })
      .onConflictDoUpdate({
        target: imnci_records.id,
        // Refuse to clobber a record from a different facility — Postgres
        // will skip the UPDATE row when this WHERE fails, leaving the
        // existing record (and its facility) untouched.
        where: eq(imnci_records.facilityId, this.context.facilityId),
        set: {
          patientId: input.patientId,
          visitId: input.visitId ?? null,
          encounterId: input.encounterId ?? null,
          ageBand: input.ageBand,
          values: input.values,
          clientUpdatedAt: new Date(input.clientUpdatedAt),
          updatedAt: sql`now()`,
          deletedAt: null,
        },
      })
      .returning();
    return row;
  }

  public async findById(id: string) {
    const [row] = await db
      .select()
      .from(imnci_records)
      .where(this.withFacilityScope(eq(imnci_records.id, id)))
      .limit(1);
    return row ?? null;
  }

  public async list(filters: ImnciRecordListFilters) {
    const where = this.composeListWhere(filters);
    const offset = (filters.page - 1) * filters.pageSize;
    const [rows, [{ count } = { count: 0 }]] = await Promise.all([
      db
        .select()
        .from(imnci_records)
        .where(where)
        .orderBy(desc(imnci_records.updatedAt))
        .limit(filters.pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(imnci_records)
        .where(where),
    ]);
    return { rows, total: count };
  }

  public async softDelete(id: string): Promise<boolean> {
    const result = await db
      .update(imnci_records)
      .set({ deletedAt: sql`now()`, updatedAt: sql`now()` })
      .where(this.withFacilityScope(eq(imnci_records.id, id)))
      .returning({ id: imnci_records.id });
    return result.length > 0;
  }

  private composeListWhere(filters: ImnciRecordListFilters): SQL {
    const conditions: Array<SQL> = [isNull(imnci_records.deletedAt)];
    if (filters.patientId) {
      conditions.push(eq(imnci_records.patientId, filters.patientId));
    }
    if (filters.ageBand) {
      conditions.push(eq(imnci_records.ageBand, filters.ageBand));
    }
    // `and()` returns SQL | undefined when given a single arg; the cast
    // keeps the type tight for the FacilityRepository helper.
    const combined = (conditions.length === 1
      ? conditions[0]
      : and(...conditions)) as SQL;
    // `withFacilityScope` returns SQL | undefined only when called with
    // no args; we always pass `combined`, so SQL is guaranteed.
    return this.withFacilityScope(combined) as SQL;
  }
}
