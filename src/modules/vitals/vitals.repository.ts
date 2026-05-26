import { db } from "../../db";
import { encounters, visits, vitals } from "../../db/schema";
import { FacilityContext } from "../../context/facility-context";
import { FacilityRepository } from "../../core/facility-repository";
import { and, count, desc, eq, sql } from "drizzle-orm";

export class VitalsRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, visits.facilityId);
  }

  public async findByPatientId(params: {
    patientId: string;
    visitId?: string;
    page: number;
    pageSize: number;
  }) {
    const offset = (params.page - 1) * params.pageSize;

    // Optional visit scoping — the visit drill-down passes visitId so vitals
    // are limited to that single encounter; callers without it get the
    // patient's full history (vitals history tab, recent-vitals strip, etc).
    const wherePredicate = and(
      eq(visits.patientId, params.patientId),
      params.visitId ? eq(vitals.visitId, params.visitId) : undefined,
    );

    const items = await db
      .select({
        id: vitals.id,
        diastolic: vitals.diastolic,
        systolic: vitals.systolic,
        temperature: vitals.temperature,
        pulse: vitals.pulse,
        respiratoryRate: vitals.respiratoryRate,
        spo2: vitals.spo2,
        weight: vitals.weight,
        height: vitals.height,
        visitId: vitals.visitId,
        encounterId: vitals.encounterId,
        createdAt: vitals.createdAt,
        updatedAt: vitals.updatedAt,
        encounterAt: encounters.encounterAt,
        encounterType: encounters.encounterType,
        doctorId: encounters.doctorId,
        visitDate: visits.date,
      })
      .from(vitals)
      .innerJoin(visits, eq(vitals.visitId, visits.id))
      .leftJoin(encounters, eq(vitals.encounterId, encounters.id))
      .where(this.withFacilityScope(wherePredicate))
      .orderBy(desc(sql`coalesce(${encounters.encounterAt}, ${visits.date})`))
      .limit(params.pageSize)
      .offset(offset);

    return items;
  }
}
