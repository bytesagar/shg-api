import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";

export class AuthService {
  private secret = process.env.JWT_SECRET || "default_secret";

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

    const token = jwt.sign(
      {
        id: foundUser.id,
        email: foundUser.email,
        role: foundUser.userType,
      },
      this.secret,
      { expiresIn: "1d" },
    );

    const { password: _, ...userWithoutPassword } = foundUser;

    return {
      user: userWithoutPassword,
      token,
    };
  }
}
