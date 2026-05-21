import { z } from "zod";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import { FacilityContext } from "../../context/facility-context";
import { HmisAnalyticsRepository } from "./hmis-analytics.repository";
import {
  HmisAnalyticsFilter,
  HmisIndicator,
  HMIS_INDICATORS,
  IndicatorResult,
} from "./hmis-analytics.types";

export const indicatorQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "from must be yyyy-mm-dd")
    .transform((s) => new Date(s)),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "to must be yyyy-mm-dd")
    .transform((s) => new Date(s)),
  fiscalYear: z
    .string()
    .regex(/^\d+$/)
    .transform((s) => Number(s))
    .optional(),
  groupBy: z.enum(["ethnicity", "zone", "month"]).optional(),
});

export type IndicatorQueryInput = z.infer<typeof indicatorQuerySchema>;

export const monthlyAggregateQuerySchema = z.object({
  year: z
    .string()
    .regex(/^\d+$/)
    .transform((s) => Number(s)),
  month: z
    .string()
    .regex(/^\d+$/)
    .transform((s) => Number(s))
    .refine((n) => n >= 1 && n <= 12, "month must be 1..12"),
});

export const monthlyAggregateRecomputeSchema = z.object({
  year: z.number().int().min(2070).max(2200),
  month: z.number().int().min(1).max(12),
});

/**
 * Bumps the inclusive `to` date to next-day midnight so half-open queries
 * pick up rows on the requested last day. Mirrors `endOfDayExclusiveUtc`
 * in `analytics.service.ts`.
 */
function endOfDayExclusiveUtc(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1),
  );
}

export class HmisAnalyticsService {
  private readonly repo = new HmisAnalyticsRepository();

  constructor(private readonly context: FacilityContext) {}

  public async getIndicator(
    indicator: HmisIndicator,
    input: IndicatorQueryInput,
  ): Promise<IndicatorResult> {
    const filter: HmisAnalyticsFilter = {
      from: input.from,
      toExclusive: endOfDayExclusiveUtc(input.to),
      facilityId: this.context.facilityId,
      fiscalYear: input.fiscalYear,
    };

    const base = await this.computeIndicator(indicator, filter);

    if (!input.groupBy) return base;

    if (input.groupBy === "ethnicity") {
      // Only ANC indicators currently support drill-down — extend as needed.
      if (indicator === "anc4_coverage") {
        const rows = await this.repo.ancNCoverageByEthnicity(
          filter,
          [1, 2, 3, 4],
        );
        return { ...base, byEthnicity: rows };
      }
      if (indicator === "anc1_coverage") {
        const rows = await this.repo.ancNCoverageByEthnicity(filter, [1]);
        return { ...base, byEthnicity: rows };
      }
      if (indicator === "anc8_completion") {
        const rows = await this.repo.ancNCoverageByEthnicity(
          filter,
          [1, 2, 3, 4, 5, 6, 7, 8],
        );
        return { ...base, byEthnicity: rows };
      }
    }

    return base;
  }

  private async computeIndicator(
    indicator: HmisIndicator,
    filter: HmisAnalyticsFilter,
  ): Promise<IndicatorResult> {
    switch (indicator) {
      case "anc1_coverage":
        return this.repo.ancNCoverage(filter, [1]);
      case "anc4_coverage":
        return this.repo.ancNCoverage(filter, [1, 2, 3, 4]);
      case "anc8_completion":
        return this.repo.ancNCoverage(filter, [1, 2, 3, 4, 5, 6, 7, 8]);
      case "ifa_180_coverage":
        return this.repo.ifa180Coverage(filter);
      case "tt2plus_coverage":
        return this.repo.tt2plusCoverage(filter);
      case "institutional_delivery_rate":
        return this.repo.institutionalDeliveryRate(filter);
      case "sba_attended_rate":
        return this.repo.sbaAttendedRate(filter);
      case "csection_rate":
        return this.repo.csectionRate(filter);
      case "stillbirth_rate_per_1000":
        return this.repo.stillbirthRatePer1000(filter);
      case "low_birth_weight_rate":
        return this.repo.lowBirthWeightRate(filter);
      case "pnc1_coverage":
        return this.repo.pncCoverage(filter, "PNC1");
      case "pnc3_coverage":
        return this.repo.pncCoverage(filter, "PNC3");
      case "pnc4_coverage":
        return this.repo.pncCoverage(filter, "PNC4");
      case "maternal_mortality_ratio_per_100k":
        return this.repo.maternalMortalityRatioPer100k(filter);
      case "complication_management_rate":
        return this.repo.complicationManagementRate(filter);

      // Child immunization (HMIS 2.2)
      case "bcg_coverage":
        return this.repo.bcgCoverage(filter);
      case "penta3_coverage":
        return this.repo.penta3Coverage(filter);
      case "mr2_coverage_23mo":
        return this.repo.mr2CoverageBy23mo(filter);
      case "dropout_penta1_penta3":
        return this.repo.vaccineDropout(
          filter,
          { code: "PENTA", doseNumber: 1 },
          { code: "PENTA", doseNumber: 3 },
        );
      case "dropout_bcg_mr1":
        return this.repo.vaccineDropout(
          filter,
          { code: "BCG", doseNumber: 1 },
          { code: "MR", doseNumber: 1 },
        );
      case "full_immunization_coverage_15mo":
        return this.repo.fullImmunizationCoverage15mo(filter);
      case "aefi_rate_per_1000_doses":
        return this.repo.aefiRatePer1000Doses(filter);
      case "hpv_coverage_grade6":
        return this.repo.hpvCoverageGrade6(filter);
      case "vita_a_round1_coverage":
        return this.repo.nutritionRoundCoverage(filter, "VITA_A", 1);
      case "deworming_round1_coverage":
        return this.repo.nutritionRoundCoverage(filter, "DEWORM", 1);

      default: {
        throw new AppError(
          `Unknown indicator: ${indicator}`,
          HTTP_STATUS.BAD_REQUEST,
        );
      }
    }
  }

  public async getMonthlyAggregate(year: number, month: number) {
    return this.repo.getAamaMonthlyAggregate({
      facilityId: this.context.facilityId,
      year,
      month,
    });
  }

  public async recomputeMonthlyAggregate(year: number, month: number) {
    if (this.context.role !== "admin" && this.context.userType !== "admin") {
      // Allow facility users to recompute their own facility — but admins
      // additionally may target other facilities (out of scope here).
    }
    await this.repo.recomputeAamaMonthlyAggregate({
      facilityId: this.context.facilityId,
      year,
      month,
    });
    return { ok: true };
  }

  public listIndicatorNames(): readonly string[] {
    return HMIS_INDICATORS;
  }
}
