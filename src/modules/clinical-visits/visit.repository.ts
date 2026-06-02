import { db } from "../../db";
import { patients, person_names, visits } from "../../db/schema";
import { FacilityContext } from "../../context/facility-context";
import { FacilityRepository } from "../../core/facility-repository";
import {
  SQL,
  and,
  desc,
  eq,
  getTableColumns,
  inArray,
  isNull,
  or,
} from "drizzle-orm";

export class VisitRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, visits.facilityId);
  }

  public async findById(id: string) {
    const result = await db
      .select()
      .from(visits)
      .where(this.withFacilityScope(eq(visits.id, id)))
      .limit(1);
    return result[0];
  }

  public async findByPatientId(patientId: string) {
    const result = await db
      .select()
      .from(visits)
      .where(this.withFacilityScope(eq(visits.patientId, patientId)))
      .limit(1);
    return result[0];
  }

  public async findActiveByPatientId(patientId: string) {
    const activeStatuses = ["planned", "arrived", "in_progress"] as const;
    const result = await db
      .select()
      .from(visits)
      .where(
        this.withFacilityScope(
          and(
            eq(visits.patientId, patientId),
            or(inArray(visits.status, activeStatuses), isNull(visits.status)),
          ),
        ),
      )
      .orderBy(desc(visits.date))
      .limit(1);
    return result[0] ?? null;
  }

  public async create(data: {
    patientId: string;
    facilityId: string;
    date: string;
    reason: string;
    service?: string | null;
    status?:
      | "planned"
      | "arrived"
      | "in_progress"
      | "finished"
      | "cancelled"
      | null;
    doctorId?: string | null;
  }) {
    const inserted = await db.insert(visits).values(data).returning();
    return inserted[0];
  }
  public async findAll(where?: SQL) {
    const result = await db
      .select()
      .from(visits)
      .where(this.withFacilityScope(where));
    return result;
  }
  /**
   * List visits with the patient's primary name joined in, so feeds/dashboards
   * render a person instead of a bare UUID. Optionally filtered by `patientId`
   * (patient-detail view) and optionally paginated (dashboard recent activity).
   * When `page`/`pageSize` are omitted, every matching visit is returned.
   */
  public async findManyWithPatient(params: {
    patientId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { patientId, page, pageSize } = params;

    const filters: SQL[] = [isNull(visits.deletedAt)];
    if (patientId) filters.push(eq(visits.patientId, patientId));

    const base = db
      .select({
        ...getTableColumns(visits),
        patientCode: patients.patientId,
        patientGiven: person_names.given,
        patientMiddle: person_names.middle,
        patientFamily: person_names.family,
      })
      .from(visits)
      .leftJoin(patients, eq(patients.id, visits.patientId))
      .leftJoin(
        person_names,
        and(
          eq(person_names.personId, patients.personId),
          eq(person_names.isPrimary, true),
        ),
      )
      .where(this.withFacilityScope(and(...filters)))
      .orderBy(desc(visits.createdAt));

    const rows =
      page && pageSize
        ? await base.limit(pageSize).offset((page - 1) * pageSize)
        : await base;

    return rows.map(
      ({
        patientCode,
        patientGiven,
        patientMiddle,
        patientFamily,
        ...visit
      }) => ({
        ...visit,
        patient: {
          id: visit.patientId,
          code: patientCode ?? null,
          firstName: patientGiven ?? null,
          middleName: patientMiddle ?? null,
          lastName: patientFamily ?? null,
          name: [patientGiven, patientMiddle, patientFamily]
            .filter(Boolean)
            .join(" "),
        },
      }),
    );
  }

  public async updateStatus(params: {
    id: string;
    status: "planned" | "arrived" | "in_progress" | "finished" | "cancelled";
  }) {
    const updated = await db
      .update(visits)
      .set({
        status: params.status,
        updatedAt: new Date(),
      })
      .where(this.withFacilityScope(eq(visits.id, params.id)))
      .returning();
    return updated[0] ?? null;
  }
}
