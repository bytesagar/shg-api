/**
 * Computes Nepal HMIS 2082 maternal-health indicators on demand.
 *
 * All queries scope to a single facility when `filter.facilityId` is set;
 * otherwise they aggregate system-wide (admin-only — enforced in the service).
 *
 * Population-target denominators (ANC1/4/8) are pulled from
 * `facility_population_targets` for the requested fiscal year and pro-rated
 * by the number of months in the query window.
 */

import { sql } from "drizzle-orm";
import { db } from "../../db";
import {
  HmisAnalyticsFilter,
  IndicatorBreakdownRow,
  IndicatorResult,
} from "./hmis-analytics.types";

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthsBetweenInclusive(from: Date, toExclusive: Date): number {
  const a = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1),
  );
  const b = new Date(
    Date.UTC(toExclusive.getUTCFullYear(), toExclusive.getUTCMonth(), 1),
  );
  const months =
    (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
    (b.getUTCMonth() - a.getUTCMonth());
  // We use the half-open window; if `toExclusive` is the very first of a
  // month we count up to (but not including) that month.
  return Math.max(months, 1);
}

function ratio(num: number, den: number): number {
  if (!den || den <= 0) return 0;
  return Math.round((num / den) * 10000) / 10000;
}

export class HmisAnalyticsRepository {
  private facilityClause(facilityId?: string) {
    return facilityId
      ? sql`AND p.facility_id = ${facilityId}::uuid`
      : sql``;
  }

  private deliveryFacilityClause(facilityId?: string) {
    return facilityId
      ? sql`AND d.facility_id IS NOT DISTINCT FROM ${facilityId}::uuid OR p.facility_id = ${facilityId}::uuid`
      : sql``;
  }

  /** ANC coverage denominator from facility_population_targets, pro-rated. */
  private async coverageDenominator(
    filter: HmisAnalyticsFilter,
  ): Promise<number> {
    if (!filter.facilityId || !filter.fiscalYear) {
      // System-wide or no fiscal year: fall back to count of registered
      // pregnancies in the window.
      const res = await db.execute<{ total: number }>(sql`
        SELECT COUNT(*)::int AS total
        FROM pregnancies p
        WHERE p.first_visit >= ${toDateStr(filter.from)}
          AND p.first_visit < ${toDateStr(filter.toExclusive)}
          AND p.deleted_at IS NULL
          ${this.facilityClause(filter.facilityId)}
      `);
      return Number(res.rows[0]?.total ?? 0);
    }

    const target = await db.execute<{ expected_pregnancies: number }>(sql`
      SELECT expected_pregnancies
      FROM facility_population_targets
      WHERE facility_id = ${filter.facilityId}::uuid
        AND fiscal_year = ${filter.fiscalYear}
        AND deleted_at IS NULL
      LIMIT 1
    `);
    const annual = Number(target.rows[0]?.expected_pregnancies ?? 0);
    if (!annual) return 0;
    const months = monthsBetweenInclusive(filter.from, filter.toExclusive);
    return Math.round((annual * months) / 12);
  }

  // ---------------------------------------------------------------------------
  // ANC coverage indicators (numerators count HMIS-compliant pregnancies)
  // ---------------------------------------------------------------------------

  public async ancNCoverage(
    filter: HmisAnalyticsFilter,
    /** Required ANC ordinals (1..8). All listed must be present in-window. */
    requiredVisits: number[],
  ): Promise<IndicatorResult> {
    const visitCodes = requiredVisits.map((n) => `ANC${n}`);
    const fromStr = toDateStr(filter.from);
    const toStr = toDateStr(filter.toExclusive);
    const numeratorRes = await db.execute<{ total: number }>(sql`
      SELECT COUNT(*)::int AS total
      FROM pregnancies p
      WHERE p.hmis_compliant = true
        AND p.first_visit >= ${fromStr}
        AND p.first_visit < ${toStr}
        AND p.deleted_at IS NULL
        ${this.facilityClause(filter.facilityId)}
        AND (
          SELECT COUNT(DISTINCT ac.protocol_visit_number)
          FROM antenatal_cares ac
          WHERE ac.pregnancy_id = p.id
            AND ac.deleted_at IS NULL
            AND ac.protocol_window_violation = false
            AND ac.protocol_visit_number = ANY(${sql.raw(`ARRAY[${visitCodes.map((v) => `'${v}'`).join(",")}]::anc_protocol_visit_enum[]`)})
        ) = ${requiredVisits.length}
    `);
    const numerator = Number(numeratorRes.rows[0]?.total ?? 0);
    const denominator = await this.coverageDenominator(filter);
    return { numerator, denominator, value: ratio(numerator, denominator) };
  }

  public async ifa180Coverage(
    filter: HmisAnalyticsFilter,
  ): Promise<IndicatorResult> {
    const fromStr = toDateStr(filter.from);
    const toStr = toDateStr(filter.toExclusive);
    const numRes = await db.execute<{ total: number }>(sql`
      SELECT COUNT(*)::int AS total FROM (
        SELECT p.id
        FROM pregnancies p
        WHERE p.first_visit >= ${fromStr}
          AND p.first_visit < ${toStr}
          AND p.deleted_at IS NULL
          ${this.facilityClause(filter.facilityId)}
          AND COALESCE((
            SELECT SUM(ac.iron_tablet)
            FROM antenatal_cares ac
            WHERE ac.pregnancy_id = p.id AND ac.deleted_at IS NULL
          ), 0) >= 180
      ) q
    `);
    const denRes = await db.execute<{ total: number }>(sql`
      SELECT COUNT(*)::int AS total
      FROM pregnancies p
      WHERE p.first_visit >= ${fromStr}
        AND p.first_visit < ${toStr}
        AND p.deleted_at IS NULL
        ${this.facilityClause(filter.facilityId)}
    `);
    const numerator = Number(numRes.rows[0]?.total ?? 0);
    const denominator = Number(denRes.rows[0]?.total ?? 0);
    return { numerator, denominator, value: ratio(numerator, denominator) };
  }

  public async tt2plusCoverage(
    filter: HmisAnalyticsFilter,
  ): Promise<IndicatorResult> {
    const fromStr = toDateStr(filter.from);
    const toStr = toDateStr(filter.toExclusive);
    const numRes = await db.execute<{ total: number }>(sql`
      SELECT COUNT(*)::int AS total
      FROM pregnancies p
      WHERE p.first_visit >= ${fromStr}
        AND p.first_visit < ${toStr}
        AND p.deleted_at IS NULL
        AND (p.td2_date IS NOT NULL OR p.td2plus_date IS NOT NULL)
        ${this.facilityClause(filter.facilityId)}
    `);
    const denRes = await db.execute<{ total: number }>(sql`
      SELECT COUNT(*)::int AS total
      FROM pregnancies p
      WHERE p.first_visit >= ${fromStr}
        AND p.first_visit < ${toStr}
        AND p.deleted_at IS NULL
        ${this.facilityClause(filter.facilityId)}
    `);
    const numerator = Number(numRes.rows[0]?.total ?? 0);
    const denominator = Number(denRes.rows[0]?.total ?? 0);
    return { numerator, denominator, value: ratio(numerator, denominator) };
  }

  // ---------------------------------------------------------------------------
  // Delivery indicators (denominator = total deliveries in window)
  // ---------------------------------------------------------------------------

  private async totalDeliveries(filter: HmisAnalyticsFilter): Promise<number> {
    const res = await db.execute<{ total: number }>(sql`
      SELECT COUNT(*)::int AS total
      FROM deliveries d
      JOIN patients p ON p.id = d.patient_id AND p.deleted_at IS NULL
      WHERE d.delivery_date >= ${toDateStr(filter.from)}
        AND d.delivery_date < ${toDateStr(filter.toExclusive)}
        AND d.deleted_at IS NULL
        ${filter.facilityId ? sql`AND p.facility_id = ${filter.facilityId}::uuid` : sql``}
    `);
    return Number(res.rows[0]?.total ?? 0);
  }

  public async institutionalDeliveryRate(
    filter: HmisAnalyticsFilter,
  ): Promise<IndicatorResult> {
    const numRes = await db.execute<{ total: number }>(sql`
      SELECT COUNT(*)::int AS total
      FROM deliveries d
      JOIN patients p ON p.id = d.patient_id AND p.deleted_at IS NULL
      WHERE d.delivery_date >= ${toDateStr(filter.from)}
        AND d.delivery_date < ${toDateStr(filter.toExclusive)}
        AND d.deleted_at IS NULL
        AND d.place_code IN ('this_facility', 'other_facility')
        ${filter.facilityId ? sql`AND p.facility_id = ${filter.facilityId}::uuid` : sql``}
    `);
    const numerator = Number(numRes.rows[0]?.total ?? 0);
    const denominator = await this.totalDeliveries(filter);
    return { numerator, denominator, value: ratio(numerator, denominator) };
  }

  public async sbaAttendedRate(
    filter: HmisAnalyticsFilter,
  ): Promise<IndicatorResult> {
    const numRes = await db.execute<{ total: number }>(sql`
      SELECT COUNT(*)::int AS total
      FROM deliveries d
      JOIN patients p ON p.id = d.patient_id AND p.deleted_at IS NULL
      WHERE d.delivery_date >= ${toDateStr(filter.from)}
        AND d.delivery_date < ${toDateStr(filter.toExclusive)}
        AND d.deleted_at IS NULL
        AND d.birth_attendant IN ('sba_anm', 'shp')
        ${filter.facilityId ? sql`AND p.facility_id = ${filter.facilityId}::uuid` : sql``}
    `);
    const numerator = Number(numRes.rows[0]?.total ?? 0);
    const denominator = await this.totalDeliveries(filter);
    return { numerator, denominator, value: ratio(numerator, denominator) };
  }

  public async csectionRate(
    filter: HmisAnalyticsFilter,
  ): Promise<IndicatorResult> {
    const numRes = await db.execute<{ total: number }>(sql`
      SELECT COUNT(*)::int AS total
      FROM deliveries d
      JOIN patients p ON p.id = d.patient_id AND p.deleted_at IS NULL
      WHERE d.delivery_date >= ${toDateStr(filter.from)}
        AND d.delivery_date < ${toDateStr(filter.toExclusive)}
        AND d.deleted_at IS NULL
        AND d.delivery_mode = 'cs'
        ${filter.facilityId ? sql`AND p.facility_id = ${filter.facilityId}::uuid` : sql``}
    `);
    const numerator = Number(numRes.rows[0]?.total ?? 0);
    const denominator = await this.totalDeliveries(filter);
    return { numerator, denominator, value: ratio(numerator, denominator) };
  }

  public async stillbirthRatePer1000(
    filter: HmisAnalyticsFilter,
  ): Promise<IndicatorResult> {
    const res = await db.execute<{
      stillborn: number;
      live: number;
    }>(sql`
      SELECT
        COALESCE(SUM(COALESCE(d.no_of_still_intrapartum,0) + COALESCE(d.no_of_still_antepartum,0)), 0)::int AS stillborn,
        COALESCE(SUM(COALESCE(d.no_of_live_term_babies,0) + COALESCE(d.no_of_live_preterm_babies,0)), 0)::int AS live
      FROM deliveries d
      JOIN patients p ON p.id = d.patient_id AND p.deleted_at IS NULL
      WHERE d.delivery_date >= ${toDateStr(filter.from)}
        AND d.delivery_date < ${toDateStr(filter.toExclusive)}
        AND d.deleted_at IS NULL
        ${filter.facilityId ? sql`AND p.facility_id = ${filter.facilityId}::uuid` : sql``}
    `);
    const stillborn = Number(res.rows[0]?.stillborn ?? 0);
    const live = Number(res.rows[0]?.live ?? 0);
    const totalBirths = stillborn + live;
    const valuePer1000 =
      totalBirths > 0 ? Math.round((stillborn / totalBirths) * 10000) / 10 : 0;
    return {
      numerator: stillborn,
      denominator: totalBirths,
      value: valuePer1000,
    };
  }

  public async lowBirthWeightRate(
    filter: HmisAnalyticsFilter,
  ): Promise<IndicatorResult> {
    const res = await db.execute<{
      lbw: number;
      total: number;
    }>(sql`
      SELECT
        COALESCE(SUM(CASE WHEN dc.weight_of_baby IS NOT NULL AND dc.weight_of_baby < 2500 THEN 1 ELSE 0 END), 0)::int AS lbw,
        COUNT(*)::int AS total
      FROM delivery_children dc
      JOIN deliveries d ON d.id = dc.delivery_id AND d.deleted_at IS NULL
      JOIN patients p ON p.id = d.patient_id AND p.deleted_at IS NULL
      WHERE d.delivery_date >= ${toDateStr(filter.from)}
        AND d.delivery_date < ${toDateStr(filter.toExclusive)}
        AND dc.deleted_at IS NULL
        ${filter.facilityId ? sql`AND p.facility_id = ${filter.facilityId}::uuid` : sql``}
    `);
    const numerator = Number(res.rows[0]?.lbw ?? 0);
    const denominator = Number(res.rows[0]?.total ?? 0);
    return { numerator, denominator, value: ratio(numerator, denominator) };
  }

  // ---------------------------------------------------------------------------
  // PNC indicators
  // ---------------------------------------------------------------------------

  public async pncCoverage(
    filter: HmisAnalyticsFilter,
    visitCode: "PNC1" | "PNC2" | "PNC3" | "PNC4",
  ): Promise<IndicatorResult> {
    const numRes = await db.execute<{ total: number }>(sql`
      SELECT COUNT(DISTINCT pnc.pregnancy_id)::int AS total
      FROM postnatal_cares pnc
      JOIN patients p ON p.id = pnc.patient_id AND p.deleted_at IS NULL
      WHERE pnc.visit_date >= ${toDateStr(filter.from)}
        AND pnc.visit_date < ${toDateStr(filter.toExclusive)}
        AND pnc.deleted_at IS NULL
        AND pnc.protocol_visit_number = ${visitCode}::pnc_protocol_visit_enum
        ${filter.facilityId ? sql`AND p.facility_id = ${filter.facilityId}::uuid` : sql``}
    `);
    const denominator = await this.totalDeliveries(filter);
    const numerator = Number(numRes.rows[0]?.total ?? 0);
    return { numerator, denominator, value: ratio(numerator, denominator) };
  }

  // ---------------------------------------------------------------------------
  // Mortality + complication management
  // ---------------------------------------------------------------------------

  public async maternalMortalityRatioPer100k(
    filter: HmisAnalyticsFilter,
  ): Promise<IndicatorResult> {
    const numRes = await db.execute<{ total: number }>(sql`
      SELECT COUNT(*)::int AS total
      FROM maternal_deaths md
      WHERE md.death_date >= ${toDateStr(filter.from)}
        AND md.death_date < ${toDateStr(filter.toExclusive)}
        AND md.deleted_at IS NULL
        ${filter.facilityId ? sql`AND md.facility_id = ${filter.facilityId}::uuid` : sql``}
    `);
    const numerator = Number(numRes.rows[0]?.total ?? 0);
    // Denominator: live births in window.
    const liveRes = await db.execute<{ live: number }>(sql`
      SELECT COALESCE(SUM(COALESCE(d.no_of_live_term_babies,0) + COALESCE(d.no_of_live_preterm_babies,0)), 0)::int AS live
      FROM deliveries d
      JOIN patients p ON p.id = d.patient_id AND p.deleted_at IS NULL
      WHERE d.delivery_date >= ${toDateStr(filter.from)}
        AND d.delivery_date < ${toDateStr(filter.toExclusive)}
        AND d.deleted_at IS NULL
        ${filter.facilityId ? sql`AND p.facility_id = ${filter.facilityId}::uuid` : sql``}
    `);
    const live = Number(liveRes.rows[0]?.live ?? 0);
    const value =
      live > 0 ? Math.round((numerator / live) * 100_000 * 10) / 10 : 0;
    return { numerator, denominator: live, value };
  }

  public async complicationManagementRate(
    filter: HmisAnalyticsFilter,
  ): Promise<IndicatorResult> {
    const res = await db.execute<{
      treated: number;
      total: number;
    }>(sql`
      SELECT
        COALESCE(SUM(CASE WHEN pc.management = 'treated' THEN 1 ELSE 0 END), 0)::int AS treated,
        COUNT(*)::int AS total
      FROM pregnancy_complications pc
      WHERE pc.recorded_at >= ${filter.from.toISOString()}
        AND pc.recorded_at < ${filter.toExclusive.toISOString()}
        AND pc.deleted_at IS NULL
        ${filter.facilityId ? sql`AND pc.facility_id = ${filter.facilityId}::uuid` : sql``}
    `);
    const numerator = Number(res.rows[0]?.treated ?? 0);
    const denominator = Number(res.rows[0]?.total ?? 0);
    return { numerator, denominator, value: ratio(numerator, denominator) };
  }

  // ---------------------------------------------------------------------------
  // Aama monthly aggregate read + recompute
  // ---------------------------------------------------------------------------

  public async getAamaMonthlyAggregate(filter: {
    facilityId?: string;
    year: number;
    month: number;
  }) {
    const res = await db.execute(sql`
      SELECT *
      FROM aama_monthly_aggregates
      WHERE year = ${filter.year}
        AND month = ${filter.month}
        ${filter.facilityId ? sql`AND facility_id = ${filter.facilityId}::uuid` : sql``}
      ORDER BY hmis_ethnic_code NULLS LAST
    `);
    return res.rows;
  }

  public async recomputeAamaMonthlyAggregate(filter: {
    facilityId: string;
    year: number;
    month: number;
  }): Promise<void> {
    const monthStart = new Date(Date.UTC(filter.year, filter.month - 1, 1));
    const monthEnd = new Date(Date.UTC(filter.year, filter.month, 1));
    const fromStr = monthStart.toISOString().slice(0, 10);
    const toStr = monthEnd.toISOString().slice(0, 10);

    // Aggregate by ethnic code; include a NULL bucket for unknown.
    const aggregate = await db.execute<{
      hmis_ethnic_code: string | null;
      anc_incentive_eligible_count: number;
      anc_incentive_paid_count: number;
      transport_eligible_count: number;
      transport_paid_count: number;
      deliveries_spontaneous: number;
      deliveries_vacuum: number;
      deliveries_forceps: number;
      deliveries_cs: number;
      deliveries_total: number;
      breech_count: number;
      shoulder_count: number;
      multiple_pregnancy_count: number;
      referred_in: number;
      referred_out: number;
      complications_managed: number;
      anti_d_given: number;
      blood_pints_total: number;
      cabin_usage_count: number;
    }>(sql`
      WITH preg AS (
        SELECT p.id, p.hmis_ethnic_code,
               COALESCE(p.anc_incentive_eligible, false) AS anc_e,
               COALESCE(p.anc_incentive_received, false) AS anc_r
        FROM pregnancies p
        WHERE p.deleted_at IS NULL
          AND p.facility_id = ${filter.facilityId}::uuid
      ),
      d AS (
        SELECT d.*, p.hmis_ethnic_code
        FROM deliveries d
        JOIN preg p ON p.id = d.pregnancy_id
        WHERE d.delivery_date >= ${fromStr}
          AND d.delivery_date < ${toStr}
          AND d.deleted_at IS NULL
      )
      SELECT
        hmis_ethnic_code,
        SUM(CASE WHEN anc_e_paid IS NOT NULL THEN 1 ELSE 0 END)::int AS anc_incentive_eligible_count,
        SUM(CASE WHEN anc_r_paid IS NOT NULL THEN 1 ELSE 0 END)::int AS anc_incentive_paid_count,
        SUM(CASE WHEN transport_e THEN 1 ELSE 0 END)::int AS transport_eligible_count,
        SUM(CASE WHEN transport_r THEN 1 ELSE 0 END)::int AS transport_paid_count,
        SUM(CASE WHEN delivery_mode = 'spontaneous' THEN 1 ELSE 0 END)::int AS deliveries_spontaneous,
        SUM(CASE WHEN delivery_mode = 'vacuum' THEN 1 ELSE 0 END)::int AS deliveries_vacuum,
        SUM(CASE WHEN delivery_mode = 'forceps' THEN 1 ELSE 0 END)::int AS deliveries_forceps,
        SUM(CASE WHEN delivery_mode = 'cs' THEN 1 ELSE 0 END)::int AS deliveries_cs,
        COUNT(*)::int AS deliveries_total,
        SUM(CASE WHEN fetal_presentation = 'breech' THEN 1 ELSE 0 END)::int AS breech_count,
        SUM(CASE WHEN fetal_presentation = 'shoulder' THEN 1 ELSE 0 END)::int AS shoulder_count,
        SUM(CASE WHEN multiple_births > 1 THEN 1 ELSE 0 END)::int AS multiple_pregnancy_count,
        SUM(CASE WHEN place_code = 'other_facility' THEN 1 ELSE 0 END)::int AS referred_in,
        SUM(CASE WHEN referred_to_facility_id IS NOT NULL THEN 1 ELSE 0 END)::int AS referred_out,
        complications_managed_in_month::int AS complications_managed,
        SUM(CASE WHEN anti_d_given THEN 1 ELSE 0 END)::int AS anti_d_given,
        COALESCE(SUM(COALESCE(blood_transfusion_pints, 0)), 0)::int AS blood_pints_total,
        SUM(CASE WHEN cabin_used THEN 1 ELSE 0 END)::int AS cabin_usage_count
      FROM (
        SELECT
          d.*,
          (SELECT 1 FROM preg pp WHERE pp.id = d.pregnancy_id AND pp.anc_e) AS anc_e_paid,
          (SELECT 1 FROM preg pp WHERE pp.id = d.pregnancy_id AND pp.anc_r) AS anc_r_paid,
          d.transport_incentive_eligible AS transport_e,
          d.transport_incentive_received AS transport_r,
          (COALESCE(d.no_of_live_male_baby,0)
           + COALESCE(d.no_of_live_female_baby,0)
           + COALESCE(d.no_of_live_term_babies,0)
           + COALESCE(d.no_of_live_preterm_babies,0)) AS multiple_births,
          (SELECT COUNT(*) FROM pregnancy_complications pc
           WHERE pc.recorded_at_delivery_id = d.id
             AND pc.management = 'treated'
             AND pc.deleted_at IS NULL) AS complications_managed_in_month
        FROM d
      ) x
      GROUP BY hmis_ethnic_code, complications_managed_in_month
    `);

    // Upsert each ethnic-code row.
    for (const row of aggregate.rows) {
      await db.execute(sql`
        INSERT INTO aama_monthly_aggregates (
          facility_id, year, month, hmis_ethnic_code,
          anc_incentive_eligible_count, anc_incentive_paid_count,
          transport_eligible_count, transport_paid_count,
          deliveries_spontaneous, deliveries_vacuum, deliveries_forceps, deliveries_cs, deliveries_total,
          breech_count, shoulder_count, multiple_pregnancy_count,
          referred_in, referred_out, complications_managed,
          anti_d_given, blood_pints_total, cabin_usage_count, computed_at
        ) VALUES (
          ${filter.facilityId}::uuid, ${filter.year}, ${filter.month}, ${row.hmis_ethnic_code}::hmis_ethnic_code_enum,
          ${row.anc_incentive_eligible_count}, ${row.anc_incentive_paid_count},
          ${row.transport_eligible_count}, ${row.transport_paid_count},
          ${row.deliveries_spontaneous}, ${row.deliveries_vacuum}, ${row.deliveries_forceps}, ${row.deliveries_cs}, ${row.deliveries_total},
          ${row.breech_count}, ${row.shoulder_count}, ${row.multiple_pregnancy_count},
          ${row.referred_in}, ${row.referred_out}, ${row.complications_managed},
          ${row.anti_d_given}, ${row.blood_pints_total}, ${row.cabin_usage_count}, now()
        )
        ON CONFLICT (facility_id, year, month, hmis_ethnic_code) DO UPDATE SET
          anc_incentive_eligible_count = EXCLUDED.anc_incentive_eligible_count,
          anc_incentive_paid_count = EXCLUDED.anc_incentive_paid_count,
          transport_eligible_count = EXCLUDED.transport_eligible_count,
          transport_paid_count = EXCLUDED.transport_paid_count,
          deliveries_spontaneous = EXCLUDED.deliveries_spontaneous,
          deliveries_vacuum = EXCLUDED.deliveries_vacuum,
          deliveries_forceps = EXCLUDED.deliveries_forceps,
          deliveries_cs = EXCLUDED.deliveries_cs,
          deliveries_total = EXCLUDED.deliveries_total,
          breech_count = EXCLUDED.breech_count,
          shoulder_count = EXCLUDED.shoulder_count,
          multiple_pregnancy_count = EXCLUDED.multiple_pregnancy_count,
          referred_in = EXCLUDED.referred_in,
          referred_out = EXCLUDED.referred_out,
          complications_managed = EXCLUDED.complications_managed,
          anti_d_given = EXCLUDED.anti_d_given,
          blood_pints_total = EXCLUDED.blood_pints_total,
          cabin_usage_count = EXCLUDED.cabin_usage_count,
          computed_at = now()
      `);
    }
  }

  // ---------------------------------------------------------------------------
  // Disaggregation helpers (used by service after computing top-level numbers)
  // ---------------------------------------------------------------------------

  public async ancNCoverageByEthnicity(
    filter: HmisAnalyticsFilter,
    requiredVisits: number[],
  ): Promise<IndicatorBreakdownRow[]> {
    const visitCodes = requiredVisits.map((n) => `ANC${n}`);
    const res = await db.execute<{
      ethnic: string | null;
      numerator: number;
      denominator: number;
    }>(sql`
      SELECT
        p.hmis_ethnic_code::text AS ethnic,
        SUM(CASE WHEN (
            SELECT COUNT(DISTINCT ac.protocol_visit_number)
            FROM antenatal_cares ac
            WHERE ac.pregnancy_id = p.id
              AND ac.deleted_at IS NULL
              AND ac.protocol_window_violation = false
              AND ac.protocol_visit_number = ANY(${sql.raw(`ARRAY[${visitCodes.map((v) => `'${v}'`).join(",")}]::anc_protocol_visit_enum[]`)})
          ) = ${requiredVisits.length} THEN 1 ELSE 0 END)::int AS numerator,
        COUNT(*)::int AS denominator
      FROM pregnancies p
      WHERE p.first_visit >= ${toDateStr(filter.from)}
        AND p.first_visit < ${toDateStr(filter.toExclusive)}
        AND p.deleted_at IS NULL
        ${filter.facilityId ? sql`AND p.facility_id = ${filter.facilityId}::uuid` : sql``}
      GROUP BY p.hmis_ethnic_code
    `);
    return res.rows.map((r) => ({
      key: r.ethnic ?? "unknown",
      numerator: Number(r.numerator ?? 0),
      denominator: Number(r.denominator ?? 0),
      value: ratio(Number(r.numerator ?? 0), Number(r.denominator ?? 0)),
    }));
  }

  // =============================================================
  // Child immunization indicators (HMIS 2.2)
  // =============================================================

  /**
   * Counts distinct patients who received any dose of the given vaccine in
   * the period. Used as the building block for BCG/Penta-1/MR-1 etc.
   */
  private async patientsWhoReceivedVaccine(
    filter: HmisAnalyticsFilter,
    vaccineCode: string,
    doseNumber?: number,
  ): Promise<number> {
    const doseClause =
      doseNumber != null
        ? sql`AND ih.dose_number = ${doseNumber}`
        : sql``;
    const res = await db.execute<{ total: number }>(sql`
      SELECT COUNT(DISTINCT ih.patient_id)::int AS total
      FROM immunization_histories ih
      WHERE ih.deleted_at IS NULL
        AND ih.vaccine_code = ${vaccineCode}
        ${doseClause}
        AND ih.administered_at >= ${filter.from.toISOString()}
        AND ih.administered_at < ${filter.toExclusive.toISOString()}
        ${filter.facilityId ? sql`AND ih.facility_id = ${filter.facilityId}::uuid` : sql``}
    `);
    return Number(res.rows[0]?.total ?? 0);
  }

  private async populationTargetForUnder1(
    filter: HmisAnalyticsFilter,
  ): Promise<number> {
    if (!filter.facilityId || !filter.fiscalYear) {
      // Fallback to children registered in the window.
      const res = await db.execute<{ total: number }>(sql`
        SELECT COUNT(*)::int AS total
        FROM child_immunizations ci
        WHERE ci.deleted_at IS NULL
          AND ci.created_at >= ${filter.from.toISOString()}
          AND ci.created_at < ${filter.toExclusive.toISOString()}
          ${filter.facilityId ? sql`AND ci.facility_id = ${filter.facilityId}::uuid` : sql``}
      `);
      return Number(res.rows[0]?.total ?? 0);
    }
    // Use expected_deliveries from facility_population_targets as a proxy
    // for "expected under-1 cohort".
    const res = await db.execute<{ expected: number }>(sql`
      SELECT expected_deliveries AS expected
      FROM facility_population_targets
      WHERE facility_id = ${filter.facilityId}::uuid
        AND fiscal_year = ${filter.fiscalYear}
        AND deleted_at IS NULL
      LIMIT 1
    `);
    return Number(res.rows[0]?.expected ?? 0);
  }

  public async bcgCoverage(
    filter: HmisAnalyticsFilter,
  ): Promise<IndicatorResult> {
    const num = await this.patientsWhoReceivedVaccine(filter, "BCG", 1);
    const den = await this.populationTargetForUnder1(filter);
    return { numerator: num, denominator: den, value: ratio(num, den) };
  }

  public async penta3Coverage(
    filter: HmisAnalyticsFilter,
  ): Promise<IndicatorResult> {
    const num = await this.patientsWhoReceivedVaccine(filter, "PENTA", 3);
    const den = await this.populationTargetForUnder1(filter);
    return { numerator: num, denominator: den, value: ratio(num, den) };
  }

  public async mr2CoverageBy23mo(
    filter: HmisAnalyticsFilter,
  ): Promise<IndicatorResult> {
    // Numerator: children who received MR dose 2 strictly before turning 24mo.
    const res = await db.execute<{ total: number }>(sql`
      SELECT COUNT(DISTINCT ih.patient_id)::int AS total
      FROM immunization_histories ih
      JOIN patients p ON p.id = ih.patient_id AND p.deleted_at IS NULL
      JOIN persons pe ON pe.id = p.person_id
      WHERE ih.deleted_at IS NULL
        AND ih.vaccine_code = 'MR'
        AND ih.dose_number = 2
        AND ih.administered_at >= ${filter.from.toISOString()}
        AND ih.administered_at < ${filter.toExclusive.toISOString()}
        AND pe.birth_date IS NOT NULL
        AND (ih.administered_at - pe.birth_date) < INTERVAL '730 days'
        ${filter.facilityId ? sql`AND ih.facility_id = ${filter.facilityId}::uuid` : sql``}
    `);
    const num = Number(res.rows[0]?.total ?? 0);
    const den = await this.populationTargetForUnder1(filter);
    return { numerator: num, denominator: den, value: ratio(num, den) };
  }

  /** (cohort with vaccineA − cohort with vaccineB) / cohort with vaccineA */
  public async vaccineDropout(
    filter: HmisAnalyticsFilter,
    vaccineA: { code: string; doseNumber: number },
    vaccineB: { code: string; doseNumber: number },
  ): Promise<IndicatorResult> {
    const denom = await this.patientsWhoReceivedVaccine(
      filter,
      vaccineA.code,
      vaccineA.doseNumber,
    );
    if (denom === 0) {
      return { numerator: 0, denominator: 0, value: 0 };
    }
    // Numerator = patients with vaccineA AND NOT vaccineB.
    const res = await db.execute<{ total: number }>(sql`
      SELECT COUNT(*)::int AS total FROM (
        SELECT DISTINCT ih.patient_id
        FROM immunization_histories ih
        WHERE ih.deleted_at IS NULL
          AND ih.vaccine_code = ${vaccineA.code}
          AND ih.dose_number = ${vaccineA.doseNumber}
          AND ih.administered_at >= ${filter.from.toISOString()}
          AND ih.administered_at < ${filter.toExclusive.toISOString()}
          ${filter.facilityId ? sql`AND ih.facility_id = ${filter.facilityId}::uuid` : sql``}
          AND NOT EXISTS (
            SELECT 1 FROM immunization_histories ih2
            WHERE ih2.deleted_at IS NULL
              AND ih2.patient_id = ih.patient_id
              AND ih2.vaccine_code = ${vaccineB.code}
              AND ih2.dose_number = ${vaccineB.doseNumber}
              ${filter.facilityId ? sql`AND ih2.facility_id = ${filter.facilityId}::uuid` : sql``}
          )
      ) q
    `);
    const num = Number(res.rows[0]?.total ?? 0);
    return { numerator: num, denominator: denom, value: ratio(num, denom) };
  }

  /**
   * Full-immunization coverage at 15 months. A child is "fully immunized"
   * when they have BCG, Penta×3, OPV×3, PCV×3, fIPV×2, MR×1, JE×1
   * (TCV is captured at 15+ months and not required at 12). All doses must
   * be on file before the child's 15-month birthday.
   *
   * For tractability we count any child whose schedule by 15 mo is complete
   * across the required (code, dose) pairs.
   */
  public async fullImmunizationCoverage15mo(
    filter: HmisAnalyticsFilter,
  ): Promise<IndicatorResult> {
    const required: Array<[string, number]> = [
      ["BCG", 1],
      ["PENTA", 1], ["PENTA", 2], ["PENTA", 3],
      ["OPV", 1], ["OPV", 2], ["OPV", 3],
      ["PCV", 1], ["PCV", 2], ["PCV", 3],
      ["FIPV", 1], ["FIPV", 2],
      ["MR", 1],
      ["JE", 1],
    ];
    const pairsSql = sql.raw(
      `ARRAY[${required.map(([c, d]) => `'${c}:${d}'`).join(",")}]::text[]`,
    );
    const res = await db.execute<{ total: number }>(sql`
      SELECT COUNT(*)::int AS total FROM (
        SELECT ih.patient_id
        FROM immunization_histories ih
        JOIN patients p ON p.id = ih.patient_id AND p.deleted_at IS NULL
        JOIN persons pe ON pe.id = p.person_id
        WHERE ih.deleted_at IS NULL
          AND ih.administered_at IS NOT NULL
          AND pe.birth_date IS NOT NULL
          AND (ih.administered_at - pe.birth_date) < INTERVAL '455 days'
          ${filter.facilityId ? sql`AND ih.facility_id = ${filter.facilityId}::uuid` : sql``}
        GROUP BY ih.patient_id
        HAVING COUNT(DISTINCT (ih.vaccine_code || ':' || ih.dose_number))
          FILTER (WHERE (ih.vaccine_code || ':' || ih.dose_number) = ANY(${pairsSql})) = ${required.length}
      ) q
    `);
    const num = Number(res.rows[0]?.total ?? 0);
    const den = await this.populationTargetForUnder1(filter);
    return { numerator: num, denominator: den, value: ratio(num, den) };
  }

  public async aefiRatePer1000Doses(
    filter: HmisAnalyticsFilter,
  ): Promise<IndicatorResult> {
    const dosesRes = await db.execute<{ total: number }>(sql`
      SELECT COUNT(*)::int AS total
      FROM immunization_histories ih
      WHERE ih.deleted_at IS NULL
        AND ih.administered_at >= ${filter.from.toISOString()}
        AND ih.administered_at < ${filter.toExclusive.toISOString()}
        ${filter.facilityId ? sql`AND ih.facility_id = ${filter.facilityId}::uuid` : sql``}
    `);
    const aefiRes = await db.execute<{ total: number }>(sql`
      SELECT COUNT(*)::int AS total
      FROM aefi_events ae
      WHERE ae.deleted_at IS NULL
        AND ae.aefi_registered_at >= ${toDateStr(filter.from)}
        AND ae.aefi_registered_at < ${toDateStr(filter.toExclusive)}
        ${filter.facilityId ? sql`AND ae.facility_id = ${filter.facilityId}::uuid` : sql``}
    `);
    const num = Number(aefiRes.rows[0]?.total ?? 0);
    const den = Number(dosesRes.rows[0]?.total ?? 0);
    const value = den > 0 ? Math.round((num / den) * 10000) / 10 : 0; // per 1000
    return { numerator: num, denominator: den, value };
  }

  public async hpvCoverageGrade6(
    filter: HmisAnalyticsFilter,
  ): Promise<IndicatorResult> {
    const num = await this.patientsWhoReceivedVaccine(filter, "HPV", 1);
    // Denominator: number of HPV school sessions × students isn't tracked;
    // fall back to listing distinct schools targeted in the window when no
    // facility-level target is set.
    const den = filter.facilityId && filter.fiscalYear
      ? await this.populationTargetForUnder1(filter)
      : num; // best-effort; analytics caller can supply explicit target
    return { numerator: num, denominator: den, value: ratio(num, den) };
  }

  public async nutritionRoundCoverage(
    filter: HmisAnalyticsFilter,
    vaccineCode: "VITA_A" | "DEWORM" | "BAALVITA",
    doseNumber: number,
  ): Promise<IndicatorResult> {
    const num = await this.patientsWhoReceivedVaccine(
      filter,
      vaccineCode,
      doseNumber,
    );
    const den = await this.populationTargetForUnder1(filter);
    return { numerator: num, denominator: den, value: ratio(num, den) };
  }
}
