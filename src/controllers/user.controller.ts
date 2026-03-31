import { Response } from "express";
import { BaseController } from "./base.controller";
import { UserService } from "../services/user.service";
import { catchAsync } from "../utils/catch-async";
import { AuthRequest } from "../middlewares/auth.middleware";
import { AppError } from "../utils/app-error";
import { HTTP_STATUS } from "../config/constants";
import { userCreateSchema } from "../validations/user.validation";
import { requireFacilityContext } from "../utils/request-context";

export class UserController extends BaseController {
  constructor() {
    super();
  }

  public getUsers = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);

    const userService = new UserService(context);
    const users = await userService.getAllUsers();
    return this.ok(res, users, "Users retrieved successfully");
  });

  public createUser = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);

    const validatedData = userCreateSchema.safeParse(req.body);
    if (!validatedData.success) {
      const errorMessages = validatedData.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      throw new AppError(
        `Validation failed: ${errorMessages}`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const userService = new UserService(context);
    try {
      const user = await userService.createUser(validatedData.data);
      return this.created(res, user, "User created successfully");
    } catch (err: any) {
      if (err?.code === "EMAIL_EXISTS") {
        throw new AppError("Email already exists", HTTP_STATUS.BAD_REQUEST);
      }
      throw err;
    }
  });
}
