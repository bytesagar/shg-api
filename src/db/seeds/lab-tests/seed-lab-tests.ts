/**
 * Idempotent seeder for the `lab_tests` reference catalog.
 *
 * Reads `data/lab-tests.json` (HMIS-aligned PATHOLOGY / RADIOLOGY list)
 * and upserts each row on the natural `(name, category)` unique index.
 * Safe to re-run after adding entries to the JSON — existing rows are
 * left untouched, new ones inserted, removed JSON entries are NOT
 * deleted from the DB (we never destroy tests automatically; clinical
 * records may reference them).
 */

import { readFileSync } from "fs";
import { join } from "path";

import { db } from "../../index";
import { lab_tests } from "../../schema";

interface LabTestSeed {
    name: string;
    category: string;
    reportTemplate?: string;
}

export async function seedLabTests(): Promise<{
    inserted: number;
    skipped: number;
    total: number;
}> {
    const data = readJsonFromRepo("data/lab-tests.json") as Array<LabTestSeed>;
    const rows = sanitize(data);

    if (rows.length === 0) {
        return { inserted: 0, skipped: 0, total: 0 };
    }

    // `onConflictDoNothing` on the (name, category) unique index turns
    // this into an idempotent upsert — re-running the seed never errors
    // and never overwrites whatever the admin may have edited in the
    // UI (we'd want explicit migration intent before clobbering).
    const result = await db
        .insert(lab_tests)
        .values(
            rows.map((r) => ({
                name: r.name,
                category: r.category,
                reportTemplate: r.reportTemplate ?? null,
            })),
        )
        .onConflictDoNothing({
            target: [lab_tests.name, lab_tests.category],
        })
        .returning({ id: lab_tests.id });

    return {
        inserted: result.length,
        skipped: rows.length - result.length,
        total: rows.length,
    };
}

/**
 * Drop rows that the JSON shouldn't have shipped in the first place
 * (null/blank name, null category). Logs once when something is
 * dropped so the next seed maintainer notices.
 */
function sanitize(data: Array<LabTestSeed>): Array<LabTestSeed> {
    const seen = new Set<string>();
    const kept: Array<LabTestSeed> = [];
    let droppedBlank = 0;
    let droppedDuplicate = 0;
    for (const row of data) {
        const name = (row.name ?? "").trim();
        const category = (row.category ?? "").trim();
        if (!name || !category) {
            droppedBlank += 1;
            continue;
        }
        const key = `${name.toLowerCase()}\x1f${category.toUpperCase()}`;
        if (seen.has(key)) {
            droppedDuplicate += 1;
            continue;
        }
        seen.add(key);
        kept.push({ name, category, reportTemplate: row.reportTemplate });
    }
    if (droppedBlank > 0) {
        console.warn(
            `[seed-lab-tests] dropped ${droppedBlank} row(s) with blank name/category`,
        );
    }
    if (droppedDuplicate > 0) {
        console.warn(
            `[seed-lab-tests] dropped ${droppedDuplicate} duplicate row(s)`,
        );
    }
    return kept;
}

function readJsonFromRepo(relPath: string): unknown {
    // `process.cwd()` is the repo root when invoked via the package
    // scripts (`yarn seed:lab-tests`). Works from `dist/` builds too
    // because the JSON ships outside the compiled output.
    const abs = join(process.cwd(), relPath);
    return JSON.parse(readFileSync(abs, "utf-8")) as unknown;
}
