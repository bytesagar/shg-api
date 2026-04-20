import { db } from "../../db";
import { patients, visits } from "../../db/schema";
import { FacilityRepository } from "../../core/facility-repository";
import { FacilityContext } from "../../context/facility-context";
import { PatientCreateInput } from "../../validations/patient.validation";
import { SQL, count, desc, eq } from "drizzle-orm";

export class PatientRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, patients.facilityId);
  }

  public async countAll(where?: SQL) {
    const result = await db
      .select({ count: count() })
      .from(patients)
      .where(this.withFacilityScope(where));
    return Number(result[0]?.count ?? 0);
  }

  public async findAll(where?: SQL, opts?: { limit: number; offset: number }) {
    const base = db
      .select()
      .from(patients)
      .where(this.withFacilityScope(where));
    if (opts) {
      return base
        .orderBy(desc(patients.createdAt))
        .limit(opts.limit)
        .offset(opts.offset);
    }
    return base;
  }

  public async findById(id: string) {
    const result = await db
      .select()
      .from(patients)
      .where(this.withFacilityScope(eq(patients.id, id)))
      .limit(1);
    return result[0];
  }

  public async createWithInitialVisit(
    data: PatientCreateInput,
    patientId: string,
  ) {
    return db.transaction(async (tx) => {
      const newPatientData = {
        ...data,
        facilityId: this.context.facilityId,
        patientId,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      };

      const inserted = await tx
        .insert(patients)
        .values(newPatientData)
        .returning();
      const newPatient = inserted[0];

      if (data.service.toLowerCase() !== "family-planning") {
        await tx.insert(visits).values({
          date: new Date(),
          reason: "Patient Registration",
          patientId: newPatient.id,
          facilityId: this.context.facilityId,
        });
      }

      return newPatient;
    });
  }
}
