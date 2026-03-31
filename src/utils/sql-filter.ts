import {
  SQL,
  and,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  or,
} from "drizzle-orm";

export type SqlFilter =
  | { raw: SQL }
  | { and: SqlFilter[] }
  | { or: SqlFilter[] }
  | { eq: { column: any; value: any } }
  | { ne: { column: any; value: any } }
  | { ilike: { column: any; value: string; mode?: "contains" | "starts" | "ends" | "exact" } }
  | { inArray: { column: any; values: any[] } }
  | { gt: { column: any; value: any } }
  | { gte: { column: any; value: any } }
  | { lt: { column: any; value: any } }
  | { lte: { column: any; value: any } }
  | { isNull: { column: any } }
  | { isNotNull: { column: any } };

export function toSqlWhere(filter?: SqlFilter): SQL | undefined {
  if (!filter) return undefined;

  if ("raw" in filter) return filter.raw;

  if ("and" in filter) {
    const parts = filter.and.map(toSqlWhere).filter(Boolean) as SQL[];
    if (parts.length === 0) return undefined;
    if (parts.length === 1) return parts[0];
    return and(...parts);
  }

  if ("or" in filter) {
    const parts = filter.or.map(toSqlWhere).filter(Boolean) as SQL[];
    if (parts.length === 0) return undefined;
    if (parts.length === 1) return parts[0];
    return or(...parts);
  }

  if ("eq" in filter) return eq(filter.eq.column, filter.eq.value);
  if ("ne" in filter) return ne(filter.ne.column, filter.ne.value);

  if ("ilike" in filter) {
    const mode = filter.ilike.mode ?? "contains";
    const v = filter.ilike.value;
    const pattern =
      mode === "exact"
        ? v
        : mode === "starts"
          ? `${v}%`
          : mode === "ends"
            ? `%${v}`
            : `%${v}%`;
    return ilike(filter.ilike.column, pattern);
  }

  if ("inArray" in filter) return inArray(filter.inArray.column, filter.inArray.values);
  if ("gt" in filter) return gt(filter.gt.column, filter.gt.value);
  if ("gte" in filter) return gte(filter.gte.column, filter.gte.value);
  if ("lt" in filter) return lt(filter.lt.column, filter.lt.value);
  if ("lte" in filter) return lte(filter.lte.column, filter.lte.value);
  if ("isNull" in filter) return isNull(filter.isNull.column);
  if ("isNotNull" in filter) return isNotNull(filter.isNotNull.column);

  return undefined;
}

export function andFilter(...filters: Array<SqlFilter | undefined>) {
  const items = filters.filter(Boolean) as SqlFilter[];
  if (items.length === 0) return undefined;
  if (items.length === 1) return items[0];
  return { and: items } as const;
}

export function orFilter(...filters: Array<SqlFilter | undefined>) {
  const items = filters.filter(Boolean) as SqlFilter[];
  if (items.length === 0) return undefined;
  if (items.length === 1) return items[0];
  return { or: items } as const;
}
