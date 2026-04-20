import { Response } from "express";
import { HTTP_STATUS } from "../config/constants";

export abstract class BaseController {
  protected ok<T>(res: Response, data: T, message: string = "Success") {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message,
      data,
    });
  }

  protected created<T>(
    res: Response,
    data: T,
    message: string = "Resource created",
  ) {
    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message,
      data,
    });
  }

  protected noContent(res: Response) {
    return res.status(204).send();
  }

  protected fail(
    res: Response,
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  ) {
    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
}
