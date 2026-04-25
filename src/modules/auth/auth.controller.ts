import { Request, Response } from "express";
import { BaseController } from "../../core/base.controller";
import { AuthService } from "./auth.service";
import { HTTP_STATUS } from "../../config/constants";
import { catchAsync } from "../../utils/catch-async";
import { AppError } from "../../utils/app-error";
import { AuthRequest } from "../../middlewares/auth.middleware";

const REFRESH_COOKIE_NAME = "shg_rt";
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/v1/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

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
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);
    return res.status(HTTP_STATUS.OK).json({
      user: result.user,
      accessToken: result.accessToken,
      expiresInSec: result.expiresInSec,
    });
  });

  public refresh = catchAsync(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      throw new AppError("Refresh token is required", HTTP_STATUS.UNAUTHORIZED);
    }
    const result = await this.authService.refresh(refreshToken);
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);
    return res.status(HTTP_STATUS.OK).json({
      user: result.user,
      accessToken: result.accessToken,
      expiresInSec: result.expiresInSec,
    });
  });

  public logout = catchAsync(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      throw new AppError("Refresh token is required", HTTP_STATUS.UNAUTHORIZED);
    }
    await this.authService.logout(refreshToken);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/v1/auth" });
    return this.ok(res, null, "Logout successful");
  });

  public me = catchAsync(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Unauthorized", HTTP_STATUS.UNAUTHORIZED);
    }
    const result = await this.authService.getCurrentUser(userId);
    return res.status(HTTP_STATUS.OK).json(result);
  });
}
