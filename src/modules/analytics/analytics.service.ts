import { z } from "zod";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import { FacilityContext } from "../../context/facility-context";
import { ANALYTICS_METHODS, AnalyticsMethod } from "./analytics.methods";
import { AnalyticsRepository } from "./analytics.repository";
import { GeographyScopeInput, Scope } from "./analytics.types";
import {
  dateRangeSchema,
  morbidityTrendSchema,
  topDiseasesSchema,
} from "../../validations/analytics.validation";

interface MethodConfig<I, O> {
  inputSchema: z.ZodType<I>;
  adminOnly?: boolean;
  requiresScopeAll?: boolean;
  run: (
    scope: Scope,
    input: I,
    repo: AnalyticsRepository,
  ) => Promise<O>;
}

/**
 * The set of facility IDs a scope restricts to, in the shape the repository
 * expects (`undefined` = all facilities; `[]` = geography matched nothing).
 */
function facilityFilter(scope: Scope): string[] | undefined {
  if (scope.kind === "facility") return [scope.facilityId];
  if (scope.kind === "facilities") return scope.facilityIds;
  return undefined;
}

/**
 * Snap a user-supplied `toDate` to the start of the *next* UTC calendar day.
 *
 * The repository uses half-open ranges (`gte(from), lt(toExclusive)`), so a
 * raw `toDate = 2026-05-18 00:00:00Z` would silently exclude every row from
 * that calendar day. The API contract is that `toDate` is the **inclusive**
 * last day — we bump to the next midnight here so callers can pick a single
 * day with `fromDate == toDate` and still see same-day rows.
 */
function endOfDayExclusiveUtc(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1),
  );
}

const METHODS: { [K in AnalyticsMethod]: MethodConfig<any, any> } = {
  TOTAL_PATIENTS: {
    inputSchema: dateRangeSchema,
    run: (scope, { fromDate, toDate }, repo) =>
      repo.totalPatients({
        from: fromDate,
        toExclusive: toDate,
        facilityIds: facilityFilter(scope),
      }),
  },
  TOTAL_OPD: {
    inputSchema: dateRangeSchema,
    run: (scope, { fromDate, toDate }, repo) =>
      repo.totalOpd({
        from: fromDate,
        toExclusive: toDate,
        facilityIds: facilityFilter(scope),
      }),
  },
  TOTAL_IMMUNIZATION: {
    inputSchema: dateRangeSchema,
    run: (scope, { fromDate, toDate }, repo) =>
      repo.totalImmunization({
        from: fromDate,
        toExclusive: toDate,
        facilityIds: facilityFilter(scope),
      }),
  },
  TOTAL_MATERNAL: {
    inputSchema: dateRangeSchema,
    run: (scope, { fromDate, toDate }, repo) =>
      repo.totalMaternal({
        from: fromDate,
        toExclusive: toDate,
        facilityIds: facilityFilter(scope),
      }),
  },
  SERVICE_WISE_REFERRALS: {
    inputSchema: dateRangeSchema,
    run: (scope, { fromDate, toDate }, repo) =>
      repo.serviceWiseReferrals({
        from: fromDate,
        toExclusive: toDate,
        facilityIds: facilityFilter(scope),
      }),
  },
  SECTOR_WISE_REFERRALS: {
    inputSchema: dateRangeSchema,
    run: (scope, { fromDate, toDate }, repo) =>
      repo.sectorWiseReferrals({
        from: fromDate,
        toExclusive: toDate,
        facilityIds: facilityFilter(scope),
      }),
  },
  TELEHEALTH_REQUESTS_TOTAL: {
    inputSchema: dateRangeSchema,
    run: (scope, { fromDate, toDate }, repo) =>
      repo.telehealthRequests(
        {
          from: fromDate,
          toExclusive: toDate,
          facilityIds: facilityFilter(scope),
        },
        null,
      ),
  },
  TELEHEALTH_REQUESTS_OPD: {
    inputSchema: dateRangeSchema,
    run: (scope, { fromDate, toDate }, repo) =>
      repo.telehealthRequests(
        {
          from: fromDate,
          toExclusive: toDate,
          facilityIds: facilityFilter(scope),
        },
        "opd",
      ),
  },
  TELEHEALTH_REQUESTS_MATERNAL: {
    inputSchema: dateRangeSchema,
    run: (scope, { fromDate, toDate }, repo) =>
      repo.telehealthRequests(
        {
          from: fromDate,
          toExclusive: toDate,
          facilityIds: facilityFilter(scope),
        },
        "maternal",
      ),
  },
  TELEHEALTH_REQUESTS_CHILD: {
    inputSchema: dateRangeSchema,
    run: (scope, { fromDate, toDate }, repo) =>
      repo.telehealthRequests(
        {
          from: fromDate,
          toExclusive: toDate,
          facilityIds: facilityFilter(scope),
        },
        "child",
      ),
  },
  OPD_FOLLOW_UP: {
    inputSchema: dateRangeSchema,
    run: (scope, { fromDate, toDate }, repo) =>
      repo.opdFollowUp({
        from: fromDate,
        toExclusive: toDate,
        facilityIds: facilityFilter(scope),
      }),
  },
  MORBIDITY_TREND: {
    inputSchema: morbidityTrendSchema,
    run: (scope, { fromDate, toDate, limit }, repo) =>
      repo.morbidityTrend(
        {
          from: fromDate,
          toExclusive: toDate,
          facilityIds: facilityFilter(scope),
        },
        limit ?? 3,
      ),
  },
  DEMOGRAPHICS_BY_GENDER: {
    inputSchema: dateRangeSchema,
    run: (scope, { fromDate, toDate }, repo) =>
      repo.demographicsByGender({
        from: fromDate,
        toExclusive: toDate,
        facilityIds: facilityFilter(scope),
      }),
  },
  PATIENTS_BY_ETHNICITY: {
    inputSchema: dateRangeSchema,
    run: (scope, { fromDate, toDate }, repo) =>
      repo.patientsByEthnicity({
        from: fromDate,
        toExclusive: toDate,
        facilityIds: facilityFilter(scope),
      }),
  },
  PATIENTS_BY_MUNICIPALITY: {
    inputSchema: dateRangeSchema,
    run: (scope, { fromDate, toDate }, repo) =>
      repo.patientsByMunicipality({
        from: fromDate,
        toExclusive: toDate,
        facilityIds: facilityFilter(scope),
      }),
  },
  PATIENTS_BY_FACILITY: {
    inputSchema: dateRangeSchema,
    run: (scope, { fromDate, toDate }, repo) =>
      repo.patientsByFacility({
        from: fromDate,
        toExclusive: toDate,
        facilityIds: facilityFilter(scope),
      }),
  },
  TOP_DISEASES: {
    inputSchema: topDiseasesSchema,
    run: (scope, { fromDate, toDate, limit }, repo) =>
      repo.topDiseases(
        {
          from: fromDate,
          toExclusive: toDate,
          facilityIds: facilityFilter(scope),
        },
        limit ?? 10,
      ),
  },
  AGE_GENDER_DISTRIBUTION: {
    inputSchema: dateRangeSchema,
    run: (scope, { fromDate, toDate }, repo) =>
      repo.ageGenderDistribution({
        from: fromDate,
        toExclusive: toDate,
        facilityIds: facilityFilter(scope),
      }),
  },
  CHART_DATA_FOR_MALE_AND_FEMALE_BY_AGE_RANGE: {
    inputSchema: dateRangeSchema,
    run: (scope, { fromDate, toDate }, repo) =>
      repo.ageGenderDistribution({
        from: fromDate,
        toExclusive: toDate,
        facilityIds: facilityFilter(scope),
      }),
  },
  VISITS_DAILY_TREND: {
    inputSchema: dateRangeSchema,
    run: (scope, { fromDate, toDate }, repo) =>
      repo.visitsDailyTrend({
        from: fromDate,
        toExclusive: toDate,
        facilityIds: facilityFilter(scope),
      }),
  },
  FACILITY_LEADERBOARD: {
    inputSchema: dateRangeSchema,
    adminOnly: true,
    requiresScopeAll: true,
    run: (_scope, { fromDate, toDate }, repo) =>
      repo.facilityLeaderboard({ from: fromDate, toExclusive: toDate }),
  },
  SYSTEM_TOTALS: {
    inputSchema: dateRangeSchema,
    adminOnly: true,
    requiresScopeAll: true,
    run: (_scope, { fromDate, toDate }, repo) =>
      repo.systemTotals({ from: fromDate, toExclusive: toDate }),
  },
  DOCTORS_APPOINTMENT_SUMMARY: {
    inputSchema: dateRangeSchema,
    run: (scope, { fromDate, toDate }, repo) =>
      repo.doctorsAppointmentSummary({
        from: fromDate,
        toExclusive: toDate,
        facilityIds: facilityFilter(scope),
      }),
  },
};

export class AnalyticsService {
  private readonly repo: AnalyticsRepository;

  constructor(private readonly context: FacilityContext) {
    this.repo = new AnalyticsRepository();
  }

  /**
   * Resolve the requested scope from the query params. Precedence:
   *   1. `facilityId=all`            → system-wide (admin only)
   *   2. province/district/municipality → the facilities within that geography
   *                                       (admin only), resolved to an ID set
   *   3. a single `facilityId`       → that facility (admin only when it isn't
   *                                       the caller's own)
   *   4. nothing                     → the caller's own facility
   */
  public async resolveScope(input: GeographyScopeInput): Promise<Scope> {
    const { facilityId, provinceId, districtId, municipalityId } = input;

    if (facilityId === "all") {
      this.requireAdmin("facilityId=all is admin-only");
      return { kind: "all" };
    }

    if (provinceId || districtId || municipalityId) {
      // Cross-facility geography scoping mirrors the `facilityId=all` gate.
      this.requireAdmin("geography filters are admin-only");
      const facilityIds = await this.repo.facilityIdsByGeography({
        provinceId,
        districtId,
        municipalityId,
      });
      return { kind: "facilities", facilityIds };
    }

    if (facilityId && facilityId !== this.context.facilityId) {
      this.requireAdmin("cannot query another facility's analytics");
      return { kind: "facility", facilityId };
    }

    return { kind: "facility", facilityId: this.context.facilityId };
  }

  private requireAdmin(action: string): void {
    if (this.context.role !== "admin") {
      throw new AppError(`Forbidden: ${action}`, HTTP_STATUS.FORBIDDEN);
    }
  }

  public async run(
    method: AnalyticsMethod,
    scope: Scope,
    rawQuery: Record<string, unknown>,
  ): Promise<{ scope: Scope; result: unknown; range: { from: Date; to: Date } }> {
    const config = METHODS[method];

    if (config.adminOnly && this.context.role !== "admin") {
      throw new AppError(
        `Forbidden: ${method} is admin-only`,
        HTTP_STATUS.FORBIDDEN,
      );
    }
    if (config.requiresScopeAll && scope.kind !== "all") {
      throw new AppError(
        `${method} requires facilityId=all`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const parsed = config.inputSchema.safeParse(rawQuery);
    if (!parsed.success) {
      const message = parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      throw new AppError(
        `Validation failed: ${message}`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const input = parsed.data as { fromDate: Date; toDate: Date };
    const adjustedInput = {
      ...parsed.data,
      toDate: endOfDayExclusiveUtc(input.toDate),
    };
    const result = await config.run(scope, adjustedInput, this.repo);

    return {
      scope,
      result,
      range: { from: input.fromDate, to: input.toDate },
    };
  }
}

export const ANALYTICS_METHOD_REGISTRY = METHODS;
export { ANALYTICS_METHODS };
