import * as bcrypt from "bcryptjs";
import { FacilityContext } from "../context/facility-context";
import { UserRepository } from "../repositories/user.repository";
import { UserCreateInput } from "../validations/user.validation";

export class UserService {
  private userRepository: UserRepository;

  constructor(private readonly context: FacilityContext) {
    this.userRepository = new UserRepository(context);
  }

  public async getAllUsers() {
    return this.userRepository.findAll();
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

    const hashedPassword = await bcrypt.hash(input.password, 10);
    return this.userRepository.create({
      ...input,
      password: hashedPassword,
    });
  }
}
