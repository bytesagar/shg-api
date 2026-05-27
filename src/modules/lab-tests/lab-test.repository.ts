import { SQL, and, asc, eq, ilike, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { lab_tests } from "@/db/schema";

export interface LabTestListFilters {
    q?: string;
    category?: string;
    page: number;
    pageSize: number;
}

export class LabTestRepository {
    /**
     * List the reference catalog. Filters: free-text `q` against name,
     * exact `category` match (PATHOLOGY / RADIOLOGY / …). Soft-deleted
     * rows are hidden. Response shape (`{ items, total, page, pageSize }`)
     * mirrors the rest of the API so the shared `useShgQuery({ paginated:
     * true })` hook consumes it without per-resource adapters.
     */
    public async list(filters: LabTestListFilters) {
        const where = this.composeWhere(filters);
        const offset = (filters.page - 1) * filters.pageSize;

        const [items, [{ count } = { count: 0 }]] = await Promise.all([
            db
                .select()
                .from(lab_tests)
                .where(where)
                .orderBy(asc(lab_tests.category), asc(lab_tests.name))
                .limit(filters.pageSize)
                .offset(offset),
            db
                .select({ count: sql<number>`count(*)::int` })
                .from(lab_tests)
                .where(where),
        ]);

        return {
            items,
            total: count,
            page: filters.page,
            pageSize: filters.pageSize,
        };
    }

    public async findById(id: string) {
        const [row] = await db
            .select()
            .from(lab_tests)
            .where(and(eq(lab_tests.id, id), isNull(lab_tests.deletedAt)))
            .limit(1);
        return row ?? null;
    }

    private composeWhere(filters: LabTestListFilters): SQL {
        const conds: Array<SQL> = [isNull(lab_tests.deletedAt)];
        if (filters.q) {
            conds.push(ilike(lab_tests.name, `%${filters.q}%`));
        }
        if (filters.category) {
            conds.push(eq(lab_tests.category, filters.category));
        }
        // `and(...)` returns `SQL | undefined` only when the spread is
        // empty — we always seed with the deletedAt clause, so the cast
        // is safe.
        return and(...conds) as SQL;
    }
}
