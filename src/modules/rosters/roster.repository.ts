import { db } from "../../db";
import { health_facilities, rosters, users } from "../../db/schema";
import { FacilityContext } from "../../context/facility-context";
import { FacilityRepository } from "../../core/facility-repository";
import {
  SQL,
  and,
  count,
  desc,
  eq,
  getTableColumns,
  gte,
  isNull,
  lt,
  lte,
} from "drizzle-orm";

export class RosterRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, rosters.facilityId);
  }

  public async findById(id: string) {
    const result = await db
      .select()
      .from(rosters)
      .where(this.withFacilityScope(eq(rosters.id, id)))
      .limit(1);
    return result[0];
  }

  public async findMany(params: {
    fromDate?: string;
    toDate?: string;
    userId?: string;
    service?: string;
    limit: number;
    offset: number;
  }) {
    const clauses: SQL[] = [isNull(rosters.deletedAt)];
    if (params.fromDate !== undefined) {
      clauses.push(gte(rosters.date, params.fromDate));
    }
    if (params.toDate !== undefined) {
      clauses.push(lte(rosters.date, params.toDate));
    }
    if (params.userId) {
      clauses.push(eq(rosters.userId, params.userId));
    }
    if (params.service) {
      clauses.push(eq(rosters.service, params.service));
    }
    const where = this.withFacilityScope(and(...clauses));

    const totalResult = await db
      .select({ count: count() })
      .from(rosters)
      .where(where);
    const total = Number(totalResult[0]?.count ?? 0);

    const items = await db
      .select({
        ...getTableColumns(rosters),
        healthFacility: {
          facilityName: health_facilities.name,
          address: health_facilities.address,
        },
        user: {
          firstName: users.firstName,
          lastName: users.lastName,
          designation: users.designation,
        },
      })
      .from(rosters)
      .where(where)
      .leftJoin(health_facilities, eq(rosters.facilityId, health_facilities.id))
      .leftJoin(users, eq(rosters.userId, users.id))
      .orderBy(desc(rosters.date), desc(rosters.createdAt))
      .limit(params.limit)
      .offset(params.offset);

    return { items, total };
  }

  public async findForUserOnDay(userId: string, date: string) {
    return db
      .select()
      .from(rosters)
      .where(
        this.withFacilityScope(
          and(
            eq(rosters.userId, userId),
            eq(rosters.date, date),
            eq(rosters.status, "active"),
            isNull(rosters.deletedAt),
          ),
        ),
      );
  }

  public async findActiveSlotsOnDay(params: { date: string; service?: string }) {
    const clauses: SQL[] = [
      eq(rosters.date, params.date),
      eq(rosters.status, "active"),
      isNull(rosters.deletedAt),
    ];
    if (params.service) {
      clauses.push(eq(rosters.service, params.service));
    }
    return db
      .select()
      .from(rosters)
      .where(this.withFacilityScope(and(...clauses)));
  }

  public async create(data: typeof rosters.$inferInsert) {
    const inserted = await db.insert(rosters).values(data).returning();
    return inserted[0];
  }

  /** All-or-nothing insert of many shifts (same transaction). */
  public async createMany(rows: (typeof rosters.$inferInsert)[]) {
    if (rows.length === 0) return [];
    return db.transaction(async (tx) => {
      const out: (typeof rosters.$inferSelect)[] = [];
      for (const data of rows) {
        const inserted = await tx.insert(rosters).values(data).returning();
        if (inserted[0]) out.push(inserted[0]);
      }
      return out;
    });
  }

  public async updateById(
    id: string,
    data: Partial<typeof rosters.$inferInsert>,
  ) {
    const updated = await db
      .update(rosters)
      .set(data)
      .where(this.withFacilityScope(eq(rosters.id, id)))
      .returning();
    return updated[0];
  }

  public async softDeleteById(id: string, deletedBy: string) {
    const now = new Date();
    const updated = await db
      .update(rosters)
      .set({
        deletedAt: now,
        deletedBy,
        updatedBy: deletedBy,
        updatedAt: now,
      })
      .where(this.withFacilityScope(eq(rosters.id, id)))
      .returning();
    return updated[0];
  }
}
