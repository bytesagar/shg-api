import { Response } from "express";
import { BaseController } from "../../core/base.controller";
import { catchAsync } from "../../utils/catch-async";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { requireFacilityContext } from "../../utils/request-context";
import { parseListQuery } from "../../utils/query-parser";
import {
  roleCreateSchema,
  roleIdParamSchema,
  rolesListQuerySchema,
  roleUpdateSchema,
} from "./roles.validation";
import { RoleService } from "./roles.service";

export class RoleController extends BaseController {
  public listRoles = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const query = parseListQuery(
      req.query as Record<string, unknown>,
      rolesListQuerySchema,
    );

    const service = new RoleService(context);
    const result = await service.listRoles(query);

    return this.ok(
      res,
      {
        items: result.items,
        total: result.total,
        page: query.page,
        pageSize: query.pageSize,
      },
      "Roles retrieved successfully",
    );
  });

  public getRole = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const parsed = roleIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      throw new AppError("Invalid role id", HTTP_STATUS.BAD_REQUEST);
    }

    const service = new RoleService(context);
    const role = await service.getRoleById(parsed.data.id);
    if (!role) {
      throw new AppError("Role not found", HTTP_STATUS.NOT_FOUND);
    }
    return this.ok(res, role, "Role retrieved successfully");
  });

  public createRole = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const validated = roleCreateSchema.safeParse(req.body);
    if (!validated.success) {
      const errorMessages = validated.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      throw new AppError(
        `Validation failed: ${errorMessages}`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const service = new RoleService(context);
    const result = await service.createRole(validated.data);
    if ("error" in result) {
      if (result.error === "ROLE_NAME_EXISTS") {
        throw new AppError("Role name already exists", HTTP_STATUS.CONFLICT);
      }
      throw new AppError("Unable to create role", HTTP_STATUS.BAD_REQUEST);
    }

    return this.created(res, result.role, "Role created successfully");
  });

  public updateRole = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);

    const paramsParsed = roleIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      throw new AppError("Invalid role id", HTTP_STATUS.BAD_REQUEST);
    }

    const bodyParsed = roleUpdateSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      const errorMessages = bodyParsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      throw new AppError(
        `Validation failed: ${errorMessages}`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const service = new RoleService(context);
    const updated = await service.updateRole(
      paramsParsed.data.id,
      bodyParsed.data,
    );
    if (updated && "error" in (updated as any)) {
      throw new AppError("Role name already exists", HTTP_STATUS.CONFLICT);
    }
    if (!updated) {
      throw new AppError("Role not found", HTTP_STATUS.NOT_FOUND);
    }

    return this.ok(res, updated, "Role updated successfully");
  });

  public deleteRole = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);

    const paramsParsed = roleIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      throw new AppError("Invalid role id", HTTP_STATUS.BAD_REQUEST);
    }

    const service = new RoleService(context);
    const deleted = await service.deleteRole(paramsParsed.data.id);
    if (!deleted) {
      throw new AppError("Role not found", HTTP_STATUS.NOT_FOUND);
    }
    return this.ok(res, deleted, "Role deleted successfully");
  });
}
