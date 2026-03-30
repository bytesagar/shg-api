import { db } from "../db";
import { patients, encounters } from "../db/schema";
import { generatePatientId } from "../utils/id-generator";
import { PatientCreateInput } from "../validations/patient.validation";
import { eq, and, sql } from "drizzle-orm";

export class PatientService {
  public async createPatient(data: PatientCreateInput, createdBy: string) {
    return await db.transaction(async (tx) => {
      // 1. Generate unique patient ID
      // 2. The unique patient id is a combined id of province,muncipality.ward code
      const patientId = await generatePatientId();

      const newPatientData = {
        ...data,
        patientId,
        createdBy,
        updatedBy: createdBy,
        
        // Drizzle will handle id, createdAt automatically
      };

      // 3. Insert patient
      const result = await tx.insert(patients).values(newPatientData).returning();
      const newPatient = result[0];

      // 4. Create initial encounter if service is not family planning
      if (data.service.toLowerCase() !== "family-planning") {
        await tx.insert(encounters).values({
          date: new Date(),
          reason: "Patient Registration",
          patientId: newPatient.id,
          facilityId: newPatient.facilityId,
          // createdBy is not on encounters yet based on the schema but let's be careful
          // doctorId could be the creator if they are a doctor
        });
      }

      return newPatient;
    });
  }

  public async getPatientById(id: string) {
    const result = await db
      .select()
      .from(patients)
      .where(eq(patients.id, id))
      .limit(1);
    return result[0];
  }

  public async getAllPatients() {
    return await db.select().from(patients);
  }
}
