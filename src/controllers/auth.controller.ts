import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { AuthService } from "../services/auth.service";
import { HTTP_STATUS } from "../config/constants";
import { catchAsync } from "../utils/catch-async";
import { AppError } from "../utils/app-error";

export class AuthController extends BaseController {
  private authService: AuthService;

  constructor() {
    super();
    this.authService = new AuthService();
  }

  public login = catchAsync(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError(
        "Email and password are required",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const result = await this.authService.login(email, password);

    return this.ok(res, result, "Login successful");
  });
}
