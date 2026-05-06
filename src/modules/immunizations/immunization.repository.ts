import { db } from "../../db";
import { child_immunizations, immunization_histories } from "../../db/schema";
import { FacilityContext } from "../../context/facility-context";
import { FacilityRepository } from "../../core/facility-repository";
import { and, eq, isNull, sql } from "drizzle-orm";

type DbTx = Parameters<Parameters<(typeof db)["transaction"]>[0]>[0];

export class ImmunizationRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, child_immunizations.facilityId);
  }

  public async upsertChildImmunizationProfile(params: {
    patientId: string;
    mothersName: string;
    fathersName: string;
    weightAtBirth?: number | null;
  }) {
    const now = new Date();

    const updated = await db
      .update(child_immunizations)
      .set({
        mothersName: params.mothersName,
        fathersName: params.fathersName,
        weightAtBirth: params.weightAtBirth ?? null,
        updatedAt: now,
      })
      .where(
        this.withFacilityScope(
          and(
            eq(child_immunizations.patientId, params.patientId),
            isNull(child_immunizations.deletedAt),
          ),
        ),
      )
      .returning();

    if (updated[0]) return updated[0];

    const inserted = await db
      .insert(child_immunizations)
      .values({
        patientId: params.patientId,
        facilityId: this.context.facilityId,
        mothersName: params.mothersName,
        fathersName: params.fathersName,
        weightAtBirth: params.weightAtBirth ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return inserted[0] ?? null;
  }

  public async createImmunizationHistoryForPatient(
    tx: DbTx,
    params: {
      patientId: string;
      visitId: string;
      encounterId: string;
      vaccineName: string;
      date: Date;
      vaccinated: number | null;
      vaccinatedDate: Date | null;
      aefi?: string | null;
      createdBy: string;
      updatedBy: string;
    },
  ) {
    const result = await tx.execute<
      typeof immunization_histories.$inferSelect
    >(sql`
      insert into immunization_histories (
        vaccine_name,
        date,
        vaccinated,
        aefi,
        vaccinated_date,
        patient_id,
        visit_id,
        encounter_id,
        child_immunization_id,
        created_by,
        updated_by
      )
      select
        ${params.vaccineName},
        ${params.date},
        ${params.vaccinated},
        ${params.aefi ?? null},
        ${params.vaccinatedDate},
        ${params.patientId}::uuid,
        ${params.visitId}::uuid,
        ${params.encounterId}::uuid,
        ci.id,
        ${params.createdBy}::uuid,
        ${params.updatedBy}::uuid
      from child_immunizations ci
      where ci.patient_id = ${params.patientId}::uuid
        and ci.facility_id = ${this.context.facilityId}::uuid
        and ci.deleted_at is null
      limit 1
      returning *
    `);

    return result.rows[0] ?? null;
  }
}
