import { Response } from "express";
import { BaseController } from "./base.controller";
import { catchAsync } from "../utils/catch-async";
import { AppError } from "../utils/app-error";
import { HTTP_STATUS } from "../config/constants";
import { AuthRequest } from "../middlewares/auth.middleware";
import { requireFacilityContext } from "../utils/request-context";
import {
  parseListQuery,
  rosterAssignableUsersQuerySchema,
  rosterAvailableUsersQuerySchema,
  rosterListQuerySchema,
} from "../utils/query-parser";
import { RosterService } from "../services/roster.service";
import {
  rosterBatchCreateSchema,
  rosterCreateSchema,
  rosterUpdateSchema,
} from "../validations/roster.validation";

export class RosterController extends BaseController {
  public listRosters = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const query = parseListQuery(req.query, rosterListQuerySchema);
    const service = new RosterService(context);
    const { items, total } = await service.listRosters(query);
    return this.ok(
      res,
      {
        items,
        total,
        page: query.page,
        pageSize: query.pageSize,
      },
      "Rosters retrieved successfully",
    );
  });

  public getAvailableUsers = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const parsed = rosterAvailableUsersQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        const msg = parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join(", ");
        throw new AppError(msg, HTTP_STATUS.BAD_REQUEST);
      }
      const service = new RosterService(context);
      const result = await service.listAvailableProviders(parsed.data);
      if ("error" in result && result.error === "INVALID_AT_TIME") {
        throw new AppError("Invalid atTime (use HH:mm)", HTTP_STATUS.BAD_REQUEST);
      }
      return this.ok(res, result, "Available providers retrieved successfully");
    },
  );

  public listAssignableUsers = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const query = parseListQuery(req.query, rosterAssignableUsersQuerySchema);
      const service = new RosterService(context);
      const { items, total } = await service.listAssignableUsers(query);
      return this.ok(
        res,
        {
          items,
          total,
          page: query.page,
          pageSize: query.pageSize,
        },
        "Assignable users retrieved successfully",
      );
    },
  );

  public getRoster = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const { id } = req.params;
    const service = new RosterService(context);
    const row = await service.getById(id as string);
    if (!row) {
      throw new AppError("Roster not found", HTTP_STATUS.NOT_FOUND);
    }
    return this.ok(res, row, "Roster retrieved successfully");
  });

  public createRoster = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const validated = rosterCreateSchema.safeParse(req.body);
    if (!validated.success) {
      const msg = validated.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      throw new AppError(msg, HTTP_STATUS.BAD_REQUEST);
    }
    const service = new RosterService(context);
    const result = await service.create(validated.data);
    if ("error" in result) {
      if (result.error === "USER_NOT_IN_FACILITY") {
        throw new AppError(
          "User not found or not in this facility",
          HTTP_STATUS.BAD_REQUEST,
        );
      }
      throw new AppError("Unable to create roster", HTTP_STATUS.BAD_REQUEST);
    }
    return this.created(res, result, "Roster created successfully");
  });

  public createRosterBatch = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const validated = rosterBatchCreateSchema.safeParse(req.body);
      if (!validated.success) {
        const msg = validated.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join(", ");
        throw new AppError(msg, HTTP_STATUS.BAD_REQUEST);
      }
      const service = new RosterService(context);
      const result = await service.createBatch(validated.data);
      if ("error" in result) {
        if (result.error === "USER_NOT_IN_FACILITY") {
          throw new AppError(
            "User not found or not in this facility",
            HTTP_STATUS.BAD_REQUEST,
          );
        }
        if (result.error === "FACILITY_MISMATCH") {
          throw new AppError(
            "Each entry's facilityId must match the current facility",
            HTTP_STATUS.BAD_REQUEST,
          );
        }
        if (result.error === "OVERLAPPING_ROSTER_ENTRIES") {
          throw new AppError(
            `Overlapping time windows on ${result.date}`,
            HTTP_STATUS.BAD_REQUEST,
          );
        }
        throw new AppError("Unable to create roster batch", HTTP_STATUS.BAD_REQUEST);
      }
      return this.created(res, result, "Roster batch created successfully");
    },
  );

  public updateRoster = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const validated = rosterUpdateSchema.safeParse(req.body);
    if (!validated.success) {
      const msg = validated.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      throw new AppError(msg, HTTP_STATUS.BAD_REQUEST);
    }
    const { id } = req.params;
    const service = new RosterService(context);
    const result = await service.update(id as string, validated.data);
    if (result && "error" in result && result.error === "NOT_FOUND") {
      throw new AppError("Roster not found", HTTP_STATUS.NOT_FOUND);
    }
    if (!result) {
      throw new AppError("Roster not found", HTTP_STATUS.NOT_FOUND);
    }
    return this.ok(res, result, "Roster updated successfully");
  });

  public deleteRoster = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const { id } = req.params;
    const service = new RosterService(context);
    const result = await service.remove(id as string);
    if (result && "error" in result && result.error === "NOT_FOUND") {
      throw new AppError("Roster not found", HTTP_STATUS.NOT_FOUND);
    }
    if (!result) {
      throw new AppError("Roster not found", HTTP_STATUS.NOT_FOUND);
    }
    return this.ok(res, result, "Roster removed successfully");
  });
}
