import { db } from "../db";
import { encounters, patients } from "../db/schema";
import { FacilityRepository } from "./facility-repository";
import { FacilityContext } from "../context/facility-context";
import { PatientCreateInput } from "../validations/patient.validation";
import { SQL, eq } from "drizzle-orm";

export class PatientRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, patients.facilityId);
  }

  public async findAll(where?: SQL) {
    return db
      .select()
      .from(patients)
      .where(this.withFacilityScope(where));
  }

  public async findById(id: string) {
    const result = await db
      .select()
      .from(patients)
      .where(this.withFacilityScope(eq(patients.id, id)))
      .limit(1);
    return result[0];
  }

  public async createWithInitialEncounter(
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

      const inserted = await tx.insert(patients).values(newPatientData).returning();
      const newPatient = inserted[0];

      if (data.service.toLowerCase() !== "family-planning") {
        await tx.insert(encounters).values({
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
