/**
 * Reconciliation report collected across all migration steps and printed at
 * the end of a run. The point is to make a run auditable at a glance:
 * for every entity, how many v1 rows existed, how many we inserted, how many
 * we skipped (already mapped / natural-key conflict), plus the soft problems
 * worth a human eyeball — derived birthDates, audit FKs that fell back to the
 * system user, and unmatched geography codes.
 */
export interface EntityStat {
  entity: string;
  v1Count: number;
  inserted: number;
  skipped: number;
  failed: number;
}

export class MigrationReport {
  private stats = new Map<string, EntityStat>();
  readonly derivedBirthDates: Array<{ v1Patient: number; birthDate: string }> = [];
  readonly unmatchedGeoCodes: Array<{ kind: string; code: number | string; name?: string }> = [];
  readonly fkFallbacks: Array<{ entity: string; v1Id: number; column: string; v1Ref: number }> = [];
  readonly unmappedEnums: Array<{ where: string; value: string }> = [];
  readonly warnings: string[] = [];

  private stat(entity: string): EntityStat {
    let s = this.stats.get(entity);
    if (!s) {
      s = { entity, v1Count: 0, inserted: 0, skipped: 0, failed: 0 };
      this.stats.set(entity, s);
    }
    return s;
  }

  setV1Count(entity: string, n: number) {
    this.stat(entity).v1Count = n;
  }
  inserted(entity: string, n = 1) {
    this.stat(entity).inserted += n;
  }
  skipped(entity: string, n = 1) {
    this.stat(entity).skipped += n;
  }
  failed(entity: string, n = 1) {
    this.stat(entity).failed += n;
  }

  recordDerivedBirthDate(v1Patient: number, birthDate: string) {
    this.derivedBirthDates.push({ v1Patient, birthDate });
  }
  recordUnmatchedGeo(kind: string, code: number | string, name?: string) {
    this.unmatchedGeoCodes.push({ kind, code, name });
  }
  recordFkFallback(entity: string, v1Id: number, column: string, v1Ref: number) {
    this.fkFallbacks.push({ entity, v1Id, column, v1Ref });
  }
  recordUnmappedEnum(where: string, value: string) {
    this.unmappedEnums.push({ where, value });
  }
  warn(msg: string) {
    this.warnings.push(msg);
  }

  print(opts: { dryRun: boolean }) {
    const line = "=".repeat(72);
    console.log(`\n${line}`);
    console.log(
      `  v1 -> v2 MIGRATION REPORT${opts.dryRun ? "  (DRY RUN — nothing written)" : ""}`,
    );
    console.log(line);

    const rows = [...this.stats.values()];
    const pad = (s: string | number, n: number) => String(s).padStart(n);
    console.log(
      `  ${"entity".padEnd(28)} ${pad("v1", 8)} ${pad("inserted", 9)} ${pad("skipped", 8)} ${pad("failed", 7)}`,
    );
    console.log(`  ${"-".repeat(64)}`);
    for (const r of rows) {
      console.log(
        `  ${r.entity.padEnd(28)} ${pad(r.v1Count, 8)} ${pad(r.inserted, 9)} ${pad(r.skipped, 8)} ${pad(r.failed, 7)}`,
      );
    }

    if (this.derivedBirthDates.length)
      console.log(`\n  Derived birthDates (age-only v1 rows): ${this.derivedBirthDates.length}`);
    if (this.fkFallbacks.length)
      console.log(`  Audit FKs fell back to system user: ${this.fkFallbacks.length}`);
    if (this.unmatchedGeoCodes.length) {
      console.log(`\n  ⚠ UNMATCHED GEOGRAPHY (${this.unmatchedGeoCodes.length}):`);
      for (const g of this.unmatchedGeoCodes.slice(0, 50))
        console.log(`      ${g.kind} code=${g.code}${g.name ? ` (${g.name})` : ""}`);
    }
    if (this.unmappedEnums.length) {
      const uniq = [...new Set(this.unmappedEnums.map((e) => `${e.where}: ${e.value}`))];
      console.log(`\n  ⚠ UNMAPPED ENUM VALUES (${uniq.length}):`);
      for (const e of uniq.slice(0, 50)) console.log(`      ${e}`);
    }
    if (this.warnings.length) {
      console.log(`\n  Warnings (${this.warnings.length}):`);
      for (const w of this.warnings.slice(0, 50)) console.log(`      ${w}`);
    }
    const totalFailed = rows.reduce((a, r) => a + r.failed, 0);
    console.log(`\n${line}`);
    console.log(
      `  TOTAL inserted=${rows.reduce((a, r) => a + r.inserted, 0)}  ` +
        `skipped=${rows.reduce((a, r) => a + r.skipped, 0)}  failed=${totalFailed}`,
    );
    console.log(`${line}\n`);
    return { totalFailed };
  }
}
