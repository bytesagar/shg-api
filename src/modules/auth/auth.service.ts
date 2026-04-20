import { db } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
import * as bcrypt from "bcryptjs";
import { signJwt } from "../../utils/jwt";

export class AuthService {
  public async login(email: string, password: string) {
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const foundUser = userResult[0];

    if (!foundUser) {
      throw new Error("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(password, foundUser.password);

    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    if (!foundUser.facilityId) {
      throw new Error("User is not associated with a facility");
    }

    const token = signJwt(
      {
        id: foundUser.id,
        email: foundUser.email,
        role: foundUser.userType,
        userType: foundUser.userType,
        facilityId: foundUser.facilityId,
      },
      { expiresIn: "1d" },
    );

    const { password: _, ...userWithoutPassword } = foundUser;

    return {
      user: userWithoutPassword,
      token,
    };
  }
}
