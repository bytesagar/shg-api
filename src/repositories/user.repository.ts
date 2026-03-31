import { db } from "../db";
import { users } from "../db/schema";
import { FacilityContext } from "../context/facility-context";
import { FacilityRepository } from "./facility-repository";
import { SQL, eq } from "drizzle-orm";

export class UserRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, users.facilityId);
  }

  private userSelect = {
    id: users.id,
    email: users.email,
    username: users.username,
    firstName: users.firstName,
    lastName: users.lastName,
    userType: users.userType,
    phoneNumber: users.phoneNumber,
    designation: users.designation,
    callStatus: users.callStatus,
    facilityId: users.facilityId,
    municipalityId: users.municipalityId,
    userRoleId: users.userRoleId,
    specialization: users.specialization,
    nmcRegistrationNumber: users.nmcRegistrationNumber,
    signatureUrl: users.signatureUrl,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
  };

  public async findAll(where?: SQL) {
    return db
      .select(this.userSelect)
      .from(users)
      .where(this.withFacilityScope(where));
  }

  public async findById(id: string) {
    const result = await db
      .select(this.userSelect)
      .from(users)
      .where(this.withFacilityScope(eq(users.id, id)))
      .limit(1);
    return result[0];
  }

  public async findByEmail(email: string) {
    const result = await db
      .select(this.userSelect)
      .from(users)
      .where(this.withFacilityScope(eq(users.email, email)))
      .limit(1);
    return result[0];
  }

  public async create(data: {
    email: string;
    username?: string | null;
    firstName: string;
    lastName: string;
    password: string;
    userType: "admin" | "user" | "facility" | "doctor";
    phoneNumber: string;
    designation?: string | null;
    municipalityId?: string | null;
    userRoleId?: string | null;
    specialization?: string | null;
    nmcRegistrationNumber?: string | null;
    signatureUrl?: string | null;
  }) {
    const inserted = await db
      .insert(users)
      .values({
        ...data,
        facilityId: this.context.facilityId,
      })
      .returning(this.userSelect);

    return inserted[0];
  }
}
