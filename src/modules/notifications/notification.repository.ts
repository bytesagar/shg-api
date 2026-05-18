import { and, desc, eq, isNull, count } from "drizzle-orm";
import { db } from "../../db";
import { notifications } from "../../db/schema";

export class NotificationRepository {
  public async insertMany(
    rows: Array<{
      userId: string;
      title: string;
      description?: string | null;
      module?: string | null;
      moduleId?: string | null;
      createdBy?: string | null;
    }>,
  ) {
    if (!rows.length) return [];
    return db
      .insert(notifications)
      .values(
        rows.map((r) => ({
          userId: r.userId,
          title: r.title,
          description: r.description ?? null,
          module: r.module ?? null,
          moduleId: r.moduleId ?? null,
          createdBy: r.createdBy ?? null,
          updatedBy: r.createdBy ?? null,
        })),
      )
      .returning();
  }

  public async listForUser(params: {
    userId: string;
    page: number;
    pageSize: number;
    unreadOnly: boolean;
  }) {
    const offset = (params.page - 1) * params.pageSize;
    const filters = [
      eq(notifications.userId, params.userId),
      isNull(notifications.deletedAt),
    ];
    if (params.unreadOnly) filters.push(eq(notifications.seen, false));
    const where = and(...filters);

    const [items, totalRow] = await Promise.all([
      db
        .select()
        .from(notifications)
        .where(where)
        .orderBy(desc(notifications.createdAt))
        .limit(params.pageSize)
        .offset(offset),
      db.select({ value: count() }).from(notifications).where(where),
    ]);

    return { items, total: totalRow[0]?.value ?? 0 };
  }

  public async findByIdForUser(id: string, userId: string) {
    const [row] = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, userId),
          isNull(notifications.deletedAt),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  public async markSeen(id: string, userId: string) {
    const [row] = await db
      .update(notifications)
      .set({ seen: true, updatedAt: new Date(), updatedBy: userId })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, userId),
          isNull(notifications.deletedAt),
        ),
      )
      .returning();
    return row ?? null;
  }

  public async markAllSeen(userId: string) {
    await db
      .update(notifications)
      .set({ seen: true, updatedAt: new Date(), updatedBy: userId })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.seen, false),
          isNull(notifications.deletedAt),
        ),
      );
  }
}
