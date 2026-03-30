import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

export class UserService {
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

  public async getAllUsers() {
    return await db.select(this.userSelect).from(users);
  }

  public async getUserById(id: string) {
    const result = await db
      .select(this.userSelect)
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0];
  }

  public async getUserByEmail(email: string) {
    const result = await db
      .select(this.userSelect)
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return result[0];
  }
}
