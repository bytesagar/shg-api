export interface HmisAnalyticsFilter {
  from: Date;
  toExclusive: Date;
  facilityId?: string;
  fiscalYear?: number;
}

export interface IndicatorBreakdownRow {
  key: string;
  numerator: number;
  denominator: number;
  value: number;
}

export interface IndicatorResult {
  numerator: number;
  denominator: number;
  /** Computed `numerator / denominator` (rounded to 4 dp); 0 if denominator is 0. */
  value: number;
  /** Optional disaggregation. */
  byEthnicity?: IndicatorBreakdownRow[];
  byZone?: IndicatorBreakdownRow[];
  byMonth?: IndicatorBreakdownRow[];
}

export type GroupBy = "ethnicity" | "zone" | "month";

export const HMIS_INDICATORS = [
  // Maternal
  "anc1_coverage",
  "anc4_coverage",
  "anc8_completion",
  "ifa_180_coverage",
  "tt2plus_coverage",
  "institutional_delivery_rate",
  "sba_attended_rate",
  "csection_rate",
  "stillbirth_rate_per_1000",
  "low_birth_weight_rate",
  "pnc1_coverage",
  "pnc3_coverage",
  "pnc4_coverage",
  "maternal_mortality_ratio_per_100k",
  "complication_management_rate",
  // Child immunization (HMIS 2.2)
  "bcg_coverage",
  "penta3_coverage",
  "mr2_coverage_23mo",
  "dropout_penta1_penta3",
  "dropout_bcg_mr1",
  "full_immunization_coverage_15mo",
  "aefi_rate_per_1000_doses",
  "hpv_coverage_grade6",
  "vita_a_round1_coverage",
  "deworming_round1_coverage",
] as const;

export type HmisIndicator = (typeof HMIS_INDICATORS)[number];

export function isHmisIndicator(value: unknown): value is HmisIndicator {
  return (
    typeof value === "string" &&
    (HMIS_INDICATORS as readonly string[]).includes(value)
  );
}

export interface AamaMonthlyAggregateRow {
  facilityId: string;
  year: number;
  month: number;
  hmisEthnicCode: string | null;
  ancIncentiveEligibleCount: number;
  ancIncentivePaidCount: number;
  transportEligibleCount: number;
  transportPaidCount: number;
  deliveriesSpontaneous: number;
  deliveriesVacuum: number;
  deliveriesForceps: number;
  deliveriesCs: number;
  deliveriesTotal: number;
  breechCount: number;
  shoulderCount: number;
  multiplePregnancyCount: number;
  referredIn: number;
  referredOut: number;
  complicationsManaged: number;
  antiDGiven: number;
  bloodPintsTotal: number;
  cabinUsageCount: number;
  computedAt: Date;
}
