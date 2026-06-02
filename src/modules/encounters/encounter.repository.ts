import { db } from "../../db";
import { encounters, patients, person_names } from "../../db/schema";
import { FacilityContext } from "../../context/facility-context";
import { FacilityRepository } from "../../core/facility-repository";
import { and, desc, eq, getTableColumns } from "drizzle-orm";

export class EncounterRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, encounters.facilityId);
  }

  public async findById(id: string) {
    const result = await db
      .select()
      .from(encounters)
      .where(this.withFacilityScope(eq(encounters.id, id)))
      .limit(1);
    return result[0] ?? null;
  }

  public async findAll(params: {
    visitId?: string;
    patientId?: string;
    doctorId?: string;
    page: number;
    pageSize: number;
  }) {
    const { visitId, patientId, doctorId, page, pageSize } = params;
    const offset = (page - 1) * pageSize;

    const filters = [];
    if (visitId) filters.push(eq(encounters.visitId, visitId));
    if (patientId) filters.push(eq(encounters.patientId, patientId));
    if (doctorId) filters.push(eq(encounters.doctorId, doctorId));

    const where =
      filters.length > 0
        ? this.withFacilityScope(and(...filters))
        : this.withFacilityScope();

    // Join the patient's primary name so list consumers (dashboards, feeds)
    // can render a person instead of a bare UUID without a second round-trip.
    const rows = await db
      .select({
        ...getTableColumns(encounters),
        patientCode: patients.patientId,
        patientGiven: person_names.given,
        patientMiddle: person_names.middle,
        patientFamily: person_names.family,
      })
      .from(encounters)
      .leftJoin(patients, eq(patients.id, encounters.patientId))
      .leftJoin(
        person_names,
        and(
          eq(person_names.personId, patients.personId),
          eq(person_names.isPrimary, true),
        ),
      )
      .where(where)
      .orderBy(desc(encounters.encounterAt))
      .limit(pageSize)
      .offset(offset);

    const items = rows.map(
      ({
        patientCode,
        patientGiven,
        patientMiddle,
        patientFamily,
        ...encounter
      }) => ({
        ...encounter,
        patient: {
          id: encounter.patientId,
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

    return { items };
  }
}
