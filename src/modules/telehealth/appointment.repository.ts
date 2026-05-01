import { db } from "../../db";
import { appointments, patients, person_names, users } from "../../db/schema";
import { FacilityContext } from "../../context/facility-context";
import { FacilityRepository } from "../../core/facility-repository";
import { utcDayBounds } from "../../utils/date-utils";
import { and, count, desc, eq, gte, inArray, isNull, lt } from "drizzle-orm";

const TELEHEALTH_ACTIVE_STATUSES = ["scheduled", "confirmed"] as const;

export class AppointmentRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, appointments.facilityId);
  }

  public async findMany(params: {
    patientId?: string;
    doctorId?: string;
    status?: (typeof appointments.$inferSelect)["status"];
    fromDate?: string;
    toDate?: string;
    limit: number;
    offset: number;
  }) {
    const clauses = [
      eq(appointments.service, "telehealth"),
      isNull(appointments.deletedAt),
    ];

    if (params.patientId)
      clauses.push(eq(appointments.patientId, params.patientId));
    if (params.doctorId)
      clauses.push(eq(appointments.doctorId, params.doctorId));
    if (params.status) clauses.push(eq(appointments.status, params.status));

    if (params.fromDate) {
      const fromUtc = params.fromDate;
      clauses.push(gte(appointments.date, fromUtc));
    }
    if (params.toDate) {
      const toUtc = params.toDate;
      clauses.push(lt(appointments.date, toUtc));
    }

    const where = this.withFacilityScope(and(...clauses));

    const totalResult = await db
      .select({ count: count() })
      .from(appointments)
      .where(where);
    const total = Number(totalResult[0]?.count ?? 0);

    const items = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        doctorId: appointments.doctorId,
        facilityId: appointments.facilityId,
        date: appointments.date,
        status: appointments.status,
        service: appointments.service,
        createdAt: appointments.createdAt,
        doctorFirstName: users.firstName,
        doctorLastName: users.lastName,
        doctorPhoneNumber: users.phoneNumber,
        doctorDesignation: users.designation,
        patientGiven: person_names.given,
        patientMiddle: person_names.middle,
        patientFamily: person_names.family,
      })
      .from(appointments)
      .where(where)
      .leftJoin(
        users,
        and(eq(users.id, appointments.doctorId), isNull(users.deletedAt)),
      )
      .leftJoin(patients, eq(patients.id, appointments.patientId))
      .leftJoin(
        person_names,
        and(
          eq(person_names.personId, patients.personId),
          eq(person_names.isPrimary, true),
        ),
      )
      .orderBy(desc(appointments.date), desc(appointments.createdAt))
      .limit(params.limit)
      .offset(params.offset);

    return {
      items: items.map((row) => ({
        id: row.id,
        patientId: row.patientId,
        doctorId: row.doctorId,
        facilityId: row.facilityId,
        date: row.date,
        status: row.status,
        service: row.service,
        createdAt: row.createdAt,
        doctor: row.doctorId
          ? {
              id: row.doctorId,
              firstName: row.doctorFirstName ?? null,
              lastName: row.doctorLastName ?? null,
              phoneNumber: row.doctorPhoneNumber ?? null,
              designation: row.doctorDesignation ?? null,
              name: [row.doctorFirstName, row.doctorLastName]
                .filter(Boolean)
                .join(" "),
            }
          : null,
        patientName: [row.patientGiven, row.patientMiddle, row.patientFamily]
          .filter(Boolean)
          .join(" "),
      })),
      total,
    };
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
    scheduledAt: string;
  }): Promise<"DOCTOR_DAY_TAKEN" | "PATIENT_DAY_TAKEN" | null> {
    const telehealthDayInFacility = this.withFacilityScope(
      and(
        eq(appointments.service, "telehealth"),
        isNull(appointments.deletedAt),
        gte(appointments.date, params.scheduledAt),
        lt(appointments.date, params.scheduledAt + " 23:59:59"),
        inArray(appointments.status, [...TELEHEALTH_ACTIVE_STATUSES]),
      ),
    );

    const doctorRow = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          telehealthDayInFacility,
          eq(appointments.doctorId, params.doctorId),
        ),
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
