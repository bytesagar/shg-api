import { db } from "../db";
import { patients, districts } from "../db/schema";
import { desc, like, eq } from "drizzle-orm";

/**
 * Generates a unique patient ID based on district code.
 * Format: {districtCode}XXXXXX where XXXXXX is a 6-digit sequence per district
 */
export async function generatePatientId(districtId?: string): Promise<string> {
  let districtCode = 101; // default to first district

  if (districtId) {
    const [district] = await db
      .select({ code: districts.code })
      .from(districts)
      .where(eq(districts.id, districtId))
      .limit(1);

    if (district) {
      districtCode = district.code;
    }
  }

  const districtPrefix = districtCode.toString();
  const lastPatient = await db
    .select({ patientId: patients.patientId })
    .from(patients)
    .where(like(patients.patientId, `${districtPrefix}%`))
    .orderBy(desc(patients.createdAt))
    .limit(1);

  if (lastPatient.length > 0) {
    const lastId = lastPatient[0].patientId;
    const sequence = parseInt(lastId, 10);
    return (sequence + 1).toString();
  } else {
    return `${districtPrefix}000001`;
  }
}
