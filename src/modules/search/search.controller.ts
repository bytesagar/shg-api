import { Response } from "express";
import { BaseController } from "../../core/base.controller";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { requireFacilityContext } from "../../utils/request-context";
import { catchAsync } from "../../utils/catch-async";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import { RBAC_ROLES, normalizeRole } from "../../constants/rbac";
import { getEmptyState } from "./search.empty-state.service";
import { searchAll } from "./search.service";
import { searchQuerySchema } from "./search.validation";
import type { ScopeContext, SearchRole } from "./types";

export class SearchController extends BaseController {
  public search = catchAsync(async (req: AuthRequest, res: Response) => {
    const ctx = this.toScopeContext(req);
    const parsed = searchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      const errorMessages = parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      throw new AppError(
        `Query validation failed: ${errorMessages}`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    const { q, types, limit, facility_id } = parsed.data;

    // Plan: non-admin passes `facility_id` -> silently ignored (don't 403).
    const adminFacilityOverride =
      ctx.role === RBAC_ROLES.ADMIN ? (facility_id ?? null) : null;

    const result = await searchAll(ctx, q, {
      limit,
      types,
      adminFacilityOverride,
    });

    return this.ok(res, result, "Search completed");
  });

  public emptyState = catchAsync(async (req: AuthRequest, res: Response) => {
    const ctx = this.toScopeContext(req);
    const result = await getEmptyState(ctx);
    // Plan: cache per user ~30s. We hint at the CDN/proxy via Cache-Control.
    // Invalidation on appointment mutations is a separate concern not in scope here.
    res.setHeader("Cache-Control", "private, max-age=30");
    return this.ok(res, result, "Empty state retrieved");
  });

  /**
   * Maps the auth middleware's `FacilityContext` onto the plan's `ScopeContext`.
   * The auth middleware already normalizes role; we cast it through the union.
   * `municipalityId` is null at this layer; the scope builder lazily fills it
   * in if/when a runner needs it (Phase 2).
   */
  private toScopeContext(req: AuthRequest): ScopeContext {
    const facilityCtx = requireFacilityContext(req);
    return {
      userId: facilityCtx.userId,
      role: (normalizeRole(facilityCtx.role) ?? facilityCtx.role) as SearchRole,
      facilityId: facilityCtx.facilityId ?? null,
      municipalityId: null,
    };
  }
}
