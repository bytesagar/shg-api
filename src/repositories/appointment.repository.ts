import { db } from "../db";
import { appointments } from "../db/schema";
import { FacilityContext } from "../context/facility-context";
import { FacilityRepository } from "./facility-repository";
import { utcDayBounds } from "../utils/date-utils";
import { and, eq, gte, inArray, isNull, lt } from "drizzle-orm";

const TELEHEALTH_ACTIVE_STATUSES = ["scheduled", "confirmed"] as const;

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

  /**
   * Telehealth: at most one active telehealth appointment per doctor per UTC day,
   * and at most one per patient per UTC day (same facility). Used to block double booking.
   */
  public async findTelehealthDayConflict(params: {
    doctorId: string;
    patientId: string;
    scheduledAt: Date;
  }): Promise<"DOCTOR_DAY_TAKEN" | "PATIENT_DAY_TAKEN" | null> {
    const { start, endExclusive } = utcDayBounds(params.scheduledAt);

    const telehealthDayInFacility = this.withFacilityScope(
      and(
        eq(appointments.service, "telehealth"),
        isNull(appointments.deletedAt),
        gte(appointments.date, start),
        lt(appointments.date, endExclusive),
        inArray(appointments.status, [...TELEHEALTH_ACTIVE_STATUSES]),
      ),
    );

    const doctorRow = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(telehealthDayInFacility, eq(appointments.doctorId, params.doctorId)),
      )
      .limit(1);
    if (doctorRow[0]) return "DOCTOR_DAY_TAKEN";

    const patientRow = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          telehealthDayInFacility,
          eq(appointments.patientId, params.patientId),
        ),
      )
      .limit(1);
    if (patientRow[0]) return "PATIENT_DAY_TAKEN";

    return null;
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
