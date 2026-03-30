import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { UserService } from "../services/user.service";
import { catchAsync } from "../utils/catch-async";

export class UserController extends BaseController {
  private userService: UserService;

  constructor() {
    super();
    this.userService = new UserService();
  }

  public getUsers = catchAsync(async (req: Request, res: Response) => {
    const users = await this.userService.getAllUsers();
    return this.ok(res, users, "Users retrieved successfully");
  });
}
