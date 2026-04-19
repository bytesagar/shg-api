import { db } from "../db";
import { attachments } from "../db/schema";
import { FacilityContext } from "../context/facility-context";
import { FacilityRepository } from "./facility-repository";
import { and, desc, eq, isNull } from "drizzle-orm";

export class AttachmentRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, attachments.facilityId);
  }

  public async findById(id: string) {
    const result = await db
      .select()
      .from(attachments)
      .where(
        this.withFacilityScope(
          and(eq(attachments.id, id), isNull(attachments.deletedAt)),
        ),
      )
      .limit(1);
    return result[0];
  }

  public async findBySource(params: {
    sourceType: string;
    sourceId: string;
  }) {
    return db
      .select()
      .from(attachments)
      .where(
        this.withFacilityScope(
          and(
            eq(attachments.sourceType, params.sourceType),
            eq(attachments.sourceId, params.sourceId),
            isNull(attachments.deletedAt),
          ),
        ),
      )
      .orderBy(desc(attachments.createdAt));
  }

  public async create(data: typeof attachments.$inferInsert) {
    const inserted = await db.insert(attachments).values(data).returning();
    return inserted[0];
  }
}
