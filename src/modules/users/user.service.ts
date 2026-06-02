import * as bcrypt from "bcryptjs";
import { FacilityContext } from "../../context/facility-context";
import { HTTP_STATUS } from "../../config/constants";
import { AppError } from "../../utils/app-error";
import { logger } from "../../utils/logger";
import { UserRepository } from "./user.repository";
import { UserCreateInput, UserUpdateInput } from "./user.validation";

export class UserService {
  private userRepository: UserRepository;

  private deriveUserTypeFromRoleName(roleName: string):
    | "admin"
    | "user"
    | "facility"
    | "doctor"
    | "fchv" {
    const normalized = roleName.trim().toLowerCase();
    if (
      normalized === "admin" ||
      normalized === "user" ||
      normalized === "facility" ||
      normalized === "doctor" ||
      normalized === "fchv"
    ) {
      return normalized;
    }
    return "user";
  }

  constructor(private readonly context: FacilityContext) {
    this.userRepository = new UserRepository(context);
  }

  public async getAllUsers(params: {
    page: number;
    pageSize: number;
    role?: string;
    userType?: "admin" | "user" | "facility" | "doctor" | "fchv";
    searchString?: string;
  }) {
    const offset = (params.page - 1) * params.pageSize;

    const [total, items] = await Promise.all([
      this.userRepository.countFiltered({
        role: params.role,
        userType: params.userType,
        searchString: params.searchString,
      }),
      this.userRepository.findFiltered({
        role: params.role,
        userType: params.userType,
        searchString: params.searchString,
        limit: params.pageSize,
        offset,
      }),
    ]);

    return {
      items,
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  public async getUserById(id: string) {
    return this.userRepository.findById(id);
  }

  public async createUser(input: UserCreateInput) {
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      const error: any = new Error("Email already exists");
      error.code = "EMAIL_EXISTS";
      throw error;
    }

    const roles = await this.userRepository.findRoleNamesByIds([input.userRoleId]);
    const primaryRole = roles[0];
    if (!primaryRole) {
      throw new AppError("Invalid userRoleId", HTTP_STATUS.BAD_REQUEST);
    }

    const userType = this.deriveUserTypeFromRoleName(primaryRole.name);

    const hashedPassword = await bcrypt.hash(input.password, 10);
    return this.userRepository.create({
      ...input,
      userType,
      passwordHash: hashedPassword,
    });
  }

  public async updateUser(id: string, input: UserUpdateInput) {
    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new AppError("User not found", HTTP_STATUS.NOT_FOUND);
    }

    // Email is globally unique — reject a collision with another account.
    if (input.email && input.email !== existing.email) {
      const dupe = await this.userRepository.findByEmail(input.email);
      if (dupe && dupe.id !== id) {
        const error: any = new Error("Email already exists");
        error.code = "EMAIL_EXISTS";
        throw error;
      }
    }

    // A role change re-derives the coarse userType the rest of the app keys on.
    let userType:
      | "admin"
      | "user"
      | "facility"
      | "doctor"
      | "fchv"
      | undefined;
    if (input.userRoleId) {
      const roles = await this.userRepository.findRoleNamesByIds([
        input.userRoleId,
      ]);
      const primaryRole = roles[0];
      if (!primaryRole) {
        throw new AppError("Invalid userRoleId", HTTP_STATUS.BAD_REQUEST);
      }
      userType = this.deriveUserTypeFromRoleName(primaryRole.name);
    }

    const { password, ...rest } = input;
    const passwordHash = password
      ? await bcrypt.hash(password, 10)
      : undefined;

    const updated = await this.userRepository.update(id, {
      ...rest,
      userType,
      passwordHash,
    });
    if (!updated) {
      throw new AppError("User not found", HTTP_STATUS.NOT_FOUND);
    }
    return updated;
  }

  /**
   * Admin-initiated password reset: sets a new password for the target user
   * (within the caller's facility scope) and revokes their active sessions so
   * any device using the old password is logged out.
   */
  public async resetPassword(id: string, password: string) {
    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new AppError("User not found", HTTP_STATUS.NOT_FOUND);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const revokedSessions = await this.userRepository.resetPassword(
      id,
      passwordHash,
    );

    logger.audit("user.password.reset", {
      actorUserId: this.context.userId,
      targetUserId: id,
      facilityId: this.context.facilityId,
      revokedSessions,
    });

    return { id, revokedSessions };
  }
}
