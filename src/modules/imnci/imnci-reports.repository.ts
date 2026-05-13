/**
 * HMIS aggregate queries over IMNCI tables. All SQL groups rows by month
 * (date_trunc 'month') and the relevant categorical dimension.
 *
 * Facility scoping is the caller's responsibility — the service decides
 * whether to pass a facilityId (most roles) or leave it undefined (admin).
 */

import { SQL, and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  imnci_fchv_commodities_dispensed,
  imnci_fchv_screenings,
  imnci_follow_ups,
  imnci_visit_classifications,
  imnci_visits,
} from "@/db/schema";

export interface MonthlyClassificationRow {
  month: string; // YYYY-MM
  facilityId: string;
  classificationCode: string;
  severity: "pink" | "yellow" | "green";
  count: number;
}

export interface VisitSummaryRow {
  month: string;
  facilityId: string;
  status: string;
  count: number;
}

export interface FollowUpSummaryRow {
  month: string;
  facilityId: string;
  status: string;
  count: number;
}

export interface CommoditiesDispensedRow {
  month: string;
  facilityId: string;
  commodity: string;
  unit: string;
  totalQuantity: number;
  events: number;
}

export interface ReportFilter {
  /** Inclusive ISO date string (YYYY-MM-DD). */
  from?: string;
  /** Inclusive ISO date string (YYYY-MM-DD). */
  to?: string;
  /** When set, restricts to a single facility. */
  facilityId?: string;
}

export class ImnciReportsRepository {
  public async monthlyClassifications(
    filter: ReportFilter,
  ): Promise<MonthlyClassificationRow[]> {
    const where = and(
      ...applyVisitDateRange(filter),
      ...applyVisitFacility(filter),
    );

    const monthExpr = sql<string>`to_char(date_trunc('month', ${imnci_visits.startedAt}), 'YYYY-MM')`;

    const rows = await db
      .select({
        month: monthExpr,
        facilityId: imnci_visits.facilityId,
        classificationCode: imnci_visit_classifications.classificationCode,
        severity: imnci_visit_classifications.severity,
        count: sql<number>`count(*)::int`,
      })
      .from(imnci_visit_classifications)
      .innerJoin(
        imnci_visits,
        eq(imnci_visit_classifications.visitId, imnci_visits.id),
      )
      .where(where)
      .groupBy(
        monthExpr,
        imnci_visits.facilityId,
        imnci_visit_classifications.classificationCode,
        imnci_visit_classifications.severity,
      )
      .orderBy(monthExpr, imnci_visits.facilityId, imnci_visit_classifications.classificationCode);

    return rows.map((r) => ({
      month: r.month,
      facilityId: r.facilityId,
      classificationCode: r.classificationCode,
      severity: r.severity,
      count: r.count,
    }));
  }

  public async visitsSummary(filter: ReportFilter): Promise<VisitSummaryRow[]> {
    const where = and(
      ...applyVisitDateRange(filter),
      ...applyVisitFacility(filter),
    );

    const monthExpr = sql<string>`to_char(date_trunc('month', ${imnci_visits.startedAt}), 'YYYY-MM')`;

    const rows = await db
      .select({
        month: monthExpr,
        facilityId: imnci_visits.facilityId,
        status: imnci_visits.status,
        count: sql<number>`count(*)::int`,
      })
      .from(imnci_visits)
      .where(where)
      .groupBy(monthExpr, imnci_visits.facilityId, imnci_visits.status)
      .orderBy(monthExpr, imnci_visits.facilityId, imnci_visits.status);

    return rows.map((r) => ({
      month: r.month,
      facilityId: r.facilityId,
      status: r.status,
      count: r.count,
    }));
  }

  public async followUpsSummary(
    filter: ReportFilter,
  ): Promise<FollowUpSummaryRow[]> {
    const conditions: SQL[] = [];
    if (filter.from) conditions.push(gte(imnci_follow_ups.dueOn, filter.from));
    if (filter.to) conditions.push(lte(imnci_follow_ups.dueOn, filter.to));
    if (filter.facilityId) {
      conditions.push(eq(imnci_follow_ups.facilityId, filter.facilityId));
    }

    const monthExpr = sql<string>`to_char(date_trunc('month', ${imnci_follow_ups.dueOn}::date), 'YYYY-MM')`;

    const rows = await db
      .select({
        month: monthExpr,
        facilityId: imnci_follow_ups.facilityId,
        status: imnci_follow_ups.status,
        count: sql<number>`count(*)::int`,
      })
      .from(imnci_follow_ups)
      .where(conditions.length ? and(...conditions) : undefined)
      .groupBy(monthExpr, imnci_follow_ups.facilityId, imnci_follow_ups.status)
      .orderBy(monthExpr, imnci_follow_ups.facilityId, imnci_follow_ups.status);

    return rows.map((r) => ({
      month: r.month,
      facilityId: r.facilityId,
      status: r.status,
      count: r.count,
    }));
  }

  public async commoditiesDispensed(
    filter: ReportFilter,
  ): Promise<CommoditiesDispensedRow[]> {
    const conditions: SQL[] = [];
    if (filter.from) {
      conditions.push(
        gte(imnci_fchv_commodities_dispensed.dispensedAt, new Date(filter.from)),
      );
    }
    if (filter.to) {
      conditions.push(
        lte(imnci_fchv_commodities_dispensed.dispensedAt, new Date(filter.to)),
      );
    }
    if (filter.facilityId) {
      conditions.push(
        eq(imnci_fchv_screenings.facilityId, filter.facilityId),
      );
    }

    const monthExpr = sql<string>`to_char(date_trunc('month', ${imnci_fchv_commodities_dispensed.dispensedAt}), 'YYYY-MM')`;

    const rows = await db
      .select({
        month: monthExpr,
        facilityId: imnci_fchv_screenings.facilityId,
        commodity: imnci_fchv_commodities_dispensed.commodity,
        unit: imnci_fchv_commodities_dispensed.unit,
        totalQuantity: sql<number>`coalesce(sum(${imnci_fchv_commodities_dispensed.quantity}), 0)::float`,
        events: sql<number>`count(*)::int`,
      })
      .from(imnci_fchv_commodities_dispensed)
      .innerJoin(
        imnci_fchv_screenings,
        eq(imnci_fchv_commodities_dispensed.screeningId, imnci_fchv_screenings.id),
      )
      .where(conditions.length ? and(...conditions) : undefined)
      .groupBy(
        monthExpr,
        imnci_fchv_screenings.facilityId,
        imnci_fchv_commodities_dispensed.commodity,
        imnci_fchv_commodities_dispensed.unit,
      )
      .orderBy(
        monthExpr,
        imnci_fchv_screenings.facilityId,
        imnci_fchv_commodities_dispensed.commodity,
      );

    return rows.map((r) => ({
      month: r.month,
      facilityId: r.facilityId,
      commodity: r.commodity,
      unit: r.unit,
      totalQuantity: r.totalQuantity,
      events: r.events,
    }));
  }
}

function applyVisitDateRange(filter: ReportFilter): SQL[] {
  const out: SQL[] = [];
  if (filter.from) out.push(gte(imnci_visits.startedAt, new Date(filter.from)));
  if (filter.to) out.push(lte(imnci_visits.startedAt, new Date(filter.to)));
  return out;
}

function applyVisitFacility(filter: ReportFilter): SQL[] {
  if (!filter.facilityId) return [];
  return [eq(imnci_visits.facilityId, filter.facilityId)];
}
