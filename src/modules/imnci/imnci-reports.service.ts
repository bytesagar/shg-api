import { FacilityContext } from "@/context/facility-context";
import { AppError } from "@/utils/app-error";
import { HTTP_STATUS } from "@/config/constants";
import { RBAC_ROLES } from "@/constants/rbac";
import {
  ImnciReportsRepository,
  type ReportFilter,
} from "./imnci-reports.repository";

export interface ReportRequest {
  /** Inclusive YYYY-MM-DD. */
  from?: string;
  /** Inclusive YYYY-MM-DD. */
  to?: string;
  /** Admin-only — explicit facility to filter on. Non-admins always see only their own facility. */
  facilityId?: string;
}

export class ImnciReportsService {
  private readonly repo: ImnciReportsRepository;

  constructor(private readonly context: FacilityContext) {
    this.repo = new ImnciReportsRepository();
  }

  public async monthlyClassifications(req: ReportRequest) {
    return this.repo.monthlyClassifications(this.resolveFilter(req));
  }

  public async visitsSummary(req: ReportRequest) {
    return this.repo.visitsSummary(this.resolveFilter(req));
  }

  public async followUpsSummary(req: ReportRequest) {
    return this.repo.followUpsSummary(this.resolveFilter(req));
  }

  public async commoditiesDispensed(req: ReportRequest) {
    return this.repo.commoditiesDispensed(this.resolveFilter(req));
  }

  /**
   * Resolve the facility filter based on caller's role:
   *   - admin: respects the request's facilityId, or no filter if omitted (cross-facility report).
   *   - everyone else: forced to caller's own facility, even if a different facilityId is requested.
   */
  private resolveFilter(req: ReportRequest): ReportFilter {
    const isAdmin = this.context.role === RBAC_ROLES.ADMIN;

    if (req.facilityId && !isAdmin && req.facilityId !== this.context.facilityId) {
      throw new AppError(
        "Forbidden: cannot request reports for another facility",
        HTTP_STATUS.FORBIDDEN,
      );
    }

    const facilityId = isAdmin ? req.facilityId : this.context.facilityId;

    return {
      from: req.from,
      to: req.to,
      facilityId,
    };
  }
}
