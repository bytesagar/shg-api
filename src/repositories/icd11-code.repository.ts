import { db } from "../db";
import { icd11_codes } from "../db/schema";
import { and, asc, count, eq, ilike, or, SQL } from "drizzle-orm";
import type { Icd11CodesListQuery } from "../validations/icd11.validation";

export class Icd11CodeRepository {
  async list(params: Icd11CodesListQuery) {
    const parts: SQL[] = [];

    if (params.category) {
      parts.push(eq(icd11_codes.category, params.category));
    }

    if (params.q) {
      const pattern = `%${params.q}%`;
      parts.push(
        or(
          ilike(icd11_codes.code, pattern),
          ilike(icd11_codes.title, pattern),
        )!,
      );
    }

    const whereClause =
      parts.length === 0
        ? undefined
        : parts.length === 1
          ? parts[0]
          : and(...parts);

    const totalResult = await db
      .select({ c: count() })
      .from(icd11_codes)
      .where(whereClause);

    const items = await db
      .select({
        id: icd11_codes.id,
        code: icd11_codes.code,
        title: icd11_codes.title,
        category: icd11_codes.category,
      })
      .from(icd11_codes)
      .where(whereClause)
      .orderBy(asc(icd11_codes.code))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize);

    return {
      items,
      total: Number(totalResult[0]?.c ?? 0),
      page: params.page,
      pageSize: params.pageSize,
    };
  }
}
