import * as bcrypt from "bcryptjs";
import { FacilityContext } from "../../context/facility-context";
import { UserRepository } from "./user.repository";
import { UserCreateInput } from "./user.validation";

export class UserService {
  private userRepository: UserRepository;

  constructor(private readonly context: FacilityContext) {
    this.userRepository = new UserRepository(context);
  }

  public async getAllUsers(params: { page: number; pageSize: number }) {
    const total = await this.userRepository.countAll();
    const items = await this.userRepository.findAll(undefined, {
      limit: params.pageSize,
      offset: (params.page - 1) * params.pageSize,
    });
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

    const hashedPassword = await bcrypt.hash(input.password, 10);
    return this.userRepository.create({
      ...input,
      passwordHash: hashedPassword,
    });
  }
}
