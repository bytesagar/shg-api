import { db } from "../../db";
import { user_roles } from "../../db/schema";
import { and, count, desc, eq, ilike, isNull, or, SQL } from "drizzle-orm";

export class RoleRepository {
  private readonly selectShape = {
    id: user_roles.id,
    name: user_roles.name,
    description: user_roles.description,
    createdAt: user_roles.createdAt,
    updatedAt: user_roles.updatedAt,
  };

  public async findById(id: string) {
    const rows = await db
      .select(this.selectShape)
      .from(user_roles)
      .where(and(eq(user_roles.id, id), isNull(user_roles.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  public async findByName(name: string) {
    const rows = await db
      .select(this.selectShape)
      .from(user_roles)
      .where(and(eq(user_roles.name, name), isNull(user_roles.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  public async create(data: { name: string; description: string }) {
    const now = new Date();
    const inserted = await db
      .insert(user_roles)
      .values({
        name: data.name,
        description: data.description,
        updatedAt: now,
      })
      .returning(this.selectShape);
    return inserted[0];
  }

  public async updateById(
    id: string,
    data: { name?: string; description?: string },
  ) {
    const now = new Date();
    const updated = await db
      .update(user_roles)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(and(eq(user_roles.id, id), isNull(user_roles.deletedAt)))
      .returning(this.selectShape);
    return updated[0] ?? null;
  }

  public async softDeleteById(id: string, deletedBy: string) {
    const now = new Date();
    const updated = await db
      .update(user_roles)
      .set({
        deletedAt: now,
        deletedBy,
        updatedAt: now,
      })
      .where(and(eq(user_roles.id, id), isNull(user_roles.deletedAt)))
      .returning(this.selectShape);
    return updated[0] ?? null;
  }

  private buildSearchWhere(searchString?: string): SQL | undefined {
    const q = searchString?.trim();
    if (!q) return undefined;
    return or(
      ilike(user_roles.name, `%${q}%`),
      ilike(user_roles.description, `%${q}%`),
    )!;
  }

  public async countFiltered(searchString?: string) {
    const where = and(
      isNull(user_roles.deletedAt),
      this.buildSearchWhere(searchString),
    );
    const rows = await db.select({ c: count() }).from(user_roles).where(where);
    return Number(rows[0]?.c ?? 0);
  }

  public async findFiltered(params: {
    searchString?: string;
    limit: number;
    offset: number;
  }) {
    const where = and(
      isNull(user_roles.deletedAt),
      this.buildSearchWhere(params.searchString),
    );
    return db
      .select(this.selectShape)
      .from(user_roles)
      .where(where)
      .orderBy(desc(user_roles.createdAt))
      .limit(params.limit)
      .offset(params.offset);
  }
}
