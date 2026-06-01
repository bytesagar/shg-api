/**
 * Read-only aggregates that power the generic (facility) dashboard.
 *
 * Everything is facility-scoped via the `facilityId` passed per call (mirrors
 * AnalyticsRepository, which is a plain class rather than a FacilityRepository
 * because its queries span many tables). "Today" is resolved server-side with
 * `CURRENT_DATE` so the client doesn't have to send a date.
 */

import { and, asc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  child_immunizations,
  growths,
  immunization_histories,
  patients,
  person_names,
  pregnancies,
  visits,
} from "../../db/schema";

export interface DeliveryAlert {
  pregnancyId: string;
  patientId: string;
  patientName: string;
  expectedDeliveryDate: string;
  days: number;
}

export interface DashboardSummary {
  glance: {
    opdToday: number;
    activePregnancies: number;
    vaccinatedToday: number;
    growthMonitoringToday: number;
  };
  alerts: {
    overdueDeliveries: DeliveryAlert[];
    dueSoonDeliveries: DeliveryAlert[];
  };
}

const DUE_SOON_DAYS = 14;

export class DashboardRepository {
  public async getSummary(facilityId: string): Promise<DashboardSummary> {
    const [
      opdToday,
      activePregnancies,
      vaccinatedToday,
      growthMonitoringToday,
      deliveryAlerts,
    ] = await Promise.all([
      this.countVisitsToday(facilityId),
      this.countActivePregnancies(facilityId),
      this.countVaccinatedToday(facilityId),
      this.countGrowthMonitoringToday(facilityId),
      this.findDeliveryAlerts(facilityId),
    ]);

    const overdueDeliveries = deliveryAlerts.filter((a) => a.days < 0);
    const dueSoonDeliveries = deliveryAlerts.filter((a) => a.days >= 0);

    return {
      glance: {
        opdToday,
        activePregnancies,
        vaccinatedToday,
        growthMonitoringToday,
      },
      alerts: { overdueDeliveries, dueSoonDeliveries },
    };
  }

  private async countVisitsToday(facilityId: string): Promise<number> {
    const rows = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(visits)
      .where(
        and(
          eq(visits.facilityId, facilityId),
          isNull(visits.deletedAt),
          sql`${visits.date}::date = CURRENT_DATE`,
        ),
      );
    return rows[0]?.total ?? 0;
  }

  private async countActivePregnancies(facilityId: string): Promise<number> {
    const rows = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(pregnancies)
      .where(
        and(
          eq(pregnancies.facilityId, facilityId),
          eq(pregnancies.status, "active"),
          isNull(pregnancies.deletedAt),
        ),
      );
    return rows[0]?.total ?? 0;
  }

  private async countVaccinatedToday(facilityId: string): Promise<number> {
    const rows = await db
      .select({
        total: sql<number>`count(distinct ${immunization_histories.patientId})::int`,
      })
      .from(immunization_histories)
      .innerJoin(
        child_immunizations,
        eq(immunization_histories.childImmunizationId, child_immunizations.id),
      )
      .where(
        and(
          eq(child_immunizations.facilityId, facilityId),
          isNull(immunization_histories.deletedAt),
          isNull(child_immunizations.deletedAt),
          sql`${immunization_histories.date}::date = CURRENT_DATE`,
        ),
      );
    return rows[0]?.total ?? 0;
  }

  private async countGrowthMonitoringToday(
    facilityId: string,
  ): Promise<number> {
    const rows = await db
      .select({
        total: sql<number>`count(distinct ${growths.patientId})::int`,
      })
      .from(growths)
      .where(
        and(
          eq(growths.facilityId, facilityId),
          isNull(growths.deletedAt),
          sql`${growths.date}::date = CURRENT_DATE`,
        ),
      );
    return rows[0]?.total ?? 0;
  }

  /**
   * Active pregnancies whose EDD has passed (overdue, `days < 0`) or lands in
   * the next two weeks (due soon, `days >= 0`). `days` is signed days from
   * today to the EDD. Patient's primary name is joined for display.
   */
  private async findDeliveryAlerts(
    facilityId: string,
  ): Promise<DeliveryAlert[]> {
    const rows = await db
      .select({
        pregnancyId: pregnancies.id,
        patientId: pregnancies.patientId,
        expectedDeliveryDate: pregnancies.expectedDeliveryDate,
        given: person_names.given,
        middle: person_names.middle,
        family: person_names.family,
        days: sql<number>`(${pregnancies.expectedDeliveryDate}::date - CURRENT_DATE)::int`,
      })
      .from(pregnancies)
      .leftJoin(patients, eq(patients.id, pregnancies.patientId))
      .leftJoin(
        person_names,
        and(
          eq(person_names.personId, patients.personId),
          eq(person_names.isPrimary, true),
        ),
      )
      .where(
        and(
          eq(pregnancies.facilityId, facilityId),
          eq(pregnancies.status, "active"),
          isNull(pregnancies.deletedAt),
          isNotNull(pregnancies.expectedDeliveryDate),
          sql`${pregnancies.expectedDeliveryDate}::date <= CURRENT_DATE + ${DUE_SOON_DAYS}::int`,
        ),
      )
      .orderBy(asc(pregnancies.expectedDeliveryDate));

    return rows.map((r) => ({
      pregnancyId: r.pregnancyId,
      patientId: r.patientId,
      patientName: [r.given, r.middle, r.family].filter(Boolean).join(" "),
      expectedDeliveryDate: r.expectedDeliveryDate as string,
      days: Number(r.days),
    }));
  }
}
