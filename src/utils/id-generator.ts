import { db } from "../db";
import { patients, districts } from "../db/schema";
import { desc, like, eq, sql } from "drizzle-orm";

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

/**
 * Generates a unique registration number for a facility. Returns one past the
 * highest numeric registration number already on the facility's patients
 * (ignoring non-numeric values), so a generated number never collides with the
 * facility's existing/imported register numbers. Starts at 1 for a facility
 * with no numeric registration numbers yet.
 */
export async function generateRegistrationNo(facilityId: string): Promise<string> {
  const [row] = await db
    .select({
      max: sql<number>`COALESCE(MAX(CASE WHEN ${patients.registrationNo} ~ '^[0-9]+$' THEN ${patients.registrationNo}::int ELSE 0 END), 0)`,
    })
    .from(patients)
    .where(eq(patients.facilityId, facilityId));

  const next = Number(row?.max ?? 0) + 1;
  return next.toString();
}
