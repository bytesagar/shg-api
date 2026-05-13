import { and, asc, eq, gte, lte, SQL } from "drizzle-orm";
import { db } from "@/db";
import { imnci_follow_ups } from "@/db/schema";
import { FacilityContext } from "@/context/facility-context";
import { FacilityRepository } from "@/core/facility-repository";

export class ImnciFollowUpRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, imnci_follow_ups.facilityId);
  }

  public async findById(id: string) {
    const rows = await db
      .select()
      .from(imnci_follow_ups)
      .where(this.withFacilityScope(eq(imnci_follow_ups.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  public async list(params: {
    page: number;
    pageSize: number;
    status?: "scheduled" | "completed" | "missed";
    from?: string;
    to?: string;
    patientId?: string;
  }) {
    const filters: SQL[] = [];
    if (params.status) filters.push(eq(imnci_follow_ups.status, params.status));
    if (params.from) filters.push(gte(imnci_follow_ups.dueOn, params.from));
    if (params.to) filters.push(lte(imnci_follow_ups.dueOn, params.to));
    if (params.patientId)
      filters.push(eq(imnci_follow_ups.patientId, params.patientId));

    const where =
      filters.length > 0
        ? this.withFacilityScope(and(...filters))
        : this.withFacilityScope();

    const offset = (params.page - 1) * params.pageSize;
    const items = await db
      .select()
      .from(imnci_follow_ups)
      .where(where)
      .orderBy(asc(imnci_follow_ups.dueOn))
      .limit(params.pageSize)
      .offset(offset);

    return { items, page: params.page, pageSize: params.pageSize };
  }

  public async markComplete(id: string, completedVisitId?: string) {
    const rows = await db
      .update(imnci_follow_ups)
      .set({
        status: "completed",
        completedAt: new Date(),
        completedVisitId: completedVisitId ?? null,
      })
      .where(this.withFacilityScope(eq(imnci_follow_ups.id, id)))
      .returning();
    return rows[0] ?? null;
  }
}
