import { db } from "../db";
import { appointments } from "../db/schema";
import { FacilityContext } from "../context/facility-context";
import { FacilityRepository } from "./facility-repository";
import { eq } from "drizzle-orm";

export class AppointmentRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, appointments.facilityId);
  }

  public async findById(id: string) {
    const result = await db
      .select()
      .from(appointments)
      .where(this.withFacilityScope(eq(appointments.id, id)))
      .limit(1);
    return result[0];
  }

  public async create(data: typeof appointments.$inferInsert) {
    const inserted = await db.insert(appointments).values(data).returning();
    return inserted[0];
  }

  public async updateById(
    id: string,
    data: Partial<typeof appointments.$inferInsert>,
  ) {
    const updated = await db
      .update(appointments)
      .set(data)
      .where(this.withFacilityScope(eq(appointments.id, id)))
      .returning();
    return updated[0];
  }
}
