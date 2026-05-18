/**
 * Aggregate queries that power the /analytics endpoint.
 *
 * Facility scoping is the caller's responsibility — pass `facilityId` to
 * restrict to one facility, or leave it undefined for a system-wide aggregate
 * (admin only — enforced in analytics.service). Every method honors soft
 * deletes via `deleted_at IS NULL` on the tables involved.
 */

import { SQL, and, desc, eq, gte, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  appointments,
  child_immunizations,
  confirm_diagnoses,
  health_facilities,
  immunization_histories,
  imnci_referrals,
  municipalities,
  patients,
  person_addresses,
  persons,
  telehealth_sessions,
  treatments,
  visits,
} from "@/db/schema";
import {
  AgeGenderBucket,
  BaseAnalyticsFilter,
  CasteBucket,
  DailyPoint,
  DiseaseBucket,
  FacilityBucket,
  FacilityLeaderboardRow,
  GenderTotals,
  MorbiditySeries,
  MunicipalityBucket,
  RequestedPerformed,
  SectorBucket,
  ServiceBucket,
  SystemTotals,
  TotalCount,
} from "./analytics.types";

type TelehealthService = "opd" | "maternal" | "child" | null;

const SERVICE_VALUES: Record<Exclude<TelehealthService, null>, string[]> = {
  opd: ["opd", "OPD"],
  maternal: ["maternal", "MATERNAL", "maternal_health", "ANC", "anc", "pnc", "PNC"],
  child: ["child", "CHILD", "child_health", "imnci", "IMNCI"],
};

function toDate(d: Date): Date {
  return d;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function withFacility(col: any, facilityId?: string): SQL | undefined {
  return facilityId ? eq(col, facilityId) : undefined;
}

function andFilters(...parts: Array<SQL | undefined>): SQL | undefined {
  const live = parts.filter((p): p is SQL => p !== undefined);
  return live.length ? and(...live) : undefined;
}

export class AnalyticsRepository {
  // ---------------------------------------------------------------------------
  // KPI cards
  // ---------------------------------------------------------------------------

  public async totalPatients(f: BaseAnalyticsFilter): Promise<TotalCount> {
    const rows = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(patients)
      .where(
        andFilters(
          gte(patients.createdAt, toDate(f.from)),
          lt(patients.createdAt, toDate(f.toExclusive)),
          isNull(patients.deletedAt),
          withFacility(patients.facilityId, f.facilityId),
        ),
      );
    return { total: rows[0]?.total ?? 0 };
  }

  public async totalOpd(f: BaseAnalyticsFilter): Promise<TotalCount> {
    const rows = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(visits)
      .where(
        andFilters(
          gte(visits.date, toDateStr(f.from)),
          lt(visits.date, toDateStr(f.toExclusive)),
          sql`lower(${visits.service}) = 'opd'`,
          isNull(visits.deletedAt),
          withFacility(visits.facilityId, f.facilityId),
        ),
      );
    return { total: rows[0]?.total ?? 0 };
  }

  public async totalImmunization(f: BaseAnalyticsFilter): Promise<TotalCount> {
    const rows = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(immunization_histories)
      .innerJoin(
        child_immunizations,
        eq(immunization_histories.childImmunizationId, child_immunizations.id),
      )
      .where(
        andFilters(
          gte(immunization_histories.date, toDate(f.from)),
          lt(immunization_histories.date, toDate(f.toExclusive)),
          isNull(immunization_histories.deletedAt),
          isNull(child_immunizations.deletedAt),
          withFacility(child_immunizations.facilityId, f.facilityId),
        ),
      );
    return { total: rows[0]?.total ?? 0 };
  }

  public async totalMaternal(f: BaseAnalyticsFilter): Promise<TotalCount> {
    const fromStr = toDateStr(f.from);
    const toStr = toDateStr(f.toExclusive);
    const facilityClause = f.facilityId
      ? sql`AND p.facility_id = ${f.facilityId}::uuid`
      : sql``;

    const result = await db.execute<{ total: number }>(sql`
      SELECT COALESCE(SUM(c), 0)::int AS total FROM (
        SELECT COUNT(*)::int AS c
        FROM antenatal_cares ac
        JOIN patients p ON p.id = ac.patient_id AND p.deleted_at IS NULL
        WHERE ac.anc_visit_date >= ${fromStr}
          AND ac.anc_visit_date < ${toStr}
          AND ac.deleted_at IS NULL
          ${facilityClause}
        UNION ALL
        SELECT COUNT(*)::int AS c
        FROM deliveries d
        JOIN patients p ON p.id = d.patient_id AND p.deleted_at IS NULL
        WHERE d.delivery_date >= ${fromStr}
          AND d.delivery_date < ${toStr}
          AND d.deleted_at IS NULL
          ${facilityClause}
        UNION ALL
        SELECT COUNT(*)::int AS c
        FROM postnatal_cares pnc
        JOIN patients p ON p.id = pnc.patient_id AND p.deleted_at IS NULL
        WHERE pnc.visit_date >= ${fromStr}
          AND pnc.visit_date < ${toStr}
          AND pnc.deleted_at IS NULL
          ${facilityClause}
      ) parts
    `);
    const total = Number(result.rows[0]?.total ?? 0);
    return { total };
  }

  // ---------------------------------------------------------------------------
  // Referrals
  // ---------------------------------------------------------------------------

  public async serviceWiseReferrals(
    f: BaseAnalyticsFilter,
  ): Promise<ServiceBucket[]> {
    const rows = await db
      .select({
        service: sql<string>`coalesce(${visits.service}, 'unknown')`,
        count: sql<number>`count(*)::int`,
      })
      .from(treatments)
      .innerJoin(visits, eq(treatments.visitId, visits.id))
      .where(
        andFilters(
          gte(treatments.createdAt, toDate(f.from)),
          lt(treatments.createdAt, toDate(f.toExclusive)),
          isNotNull(treatments.refer),
          sql`length(trim(${treatments.refer})) > 0`,
          isNull(treatments.deletedAt),
          isNull(visits.deletedAt),
          withFacility(visits.facilityId, f.facilityId),
        ),
      )
      .groupBy(visits.service);

    const childRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(imnci_referrals)
      .where(
        andFilters(
          gte(imnci_referrals.referredAt, toDate(f.from)),
          lt(imnci_referrals.referredAt, toDate(f.toExclusive)),
          withFacility(imnci_referrals.facilityId, f.facilityId),
        ),
      );

    const result: ServiceBucket[] = rows.map((r) => ({
      service: r.service,
      count: r.count,
    }));

    const childCount = childRows[0]?.count ?? 0;
    if (childCount > 0) {
      const existing = result.find(
        (r) => r.service.toLowerCase() === "child" || r.service.toLowerCase() === "imnci",
      );
      if (existing) {
        existing.count += childCount;
      } else {
        result.push({ service: "child", count: childCount });
      }
    }

    return result.sort((a, b) => b.count - a.count);
  }

  public async sectorWiseReferrals(
    f: BaseAnalyticsFilter,
  ): Promise<SectorBucket[]> {
    const fromTs = f.from;
    const toTs = f.toExclusive;

    // Treatments: free-text `refer`. Best-effort: case-insensitive trimmed
    // name match against `health_facilities` to resolve a destination type.
    // Unmatched / external destinations bucket as "unknown".
    const treatmentsFacilityClause = f.facilityId
      ? sql`AND v.facility_id = ${f.facilityId}::uuid`
      : sql``;
    const imnciFacilityClause = f.facilityId
      ? sql`AND ir.facility_id = ${f.facilityId}::uuid`
      : sql``;

    const result = await db.execute<{ sector: string; count: number }>(sql`
      WITH refs AS (
        SELECT COALESCE(hf.facility_type, 'unknown') AS sector
        FROM treatments t
        JOIN visits v ON v.id = t.visit_id AND v.deleted_at IS NULL
        LEFT JOIN health_facilities hf
          ON lower(trim(hf.name)) = lower(trim(t.refer))
         AND hf.deleted_at IS NULL
        WHERE t.refer IS NOT NULL
          AND length(trim(t.refer)) > 0
          AND t.created_at >= ${fromTs}
          AND t.created_at < ${toTs}
          AND t.deleted_at IS NULL
          ${treatmentsFacilityClause}

        UNION ALL

        SELECT COALESCE(hf.facility_type, 'unknown') AS sector
        FROM imnci_referrals ir
        LEFT JOIN health_facilities hf
          ON hf.id = ir.to_facility_id
         AND hf.deleted_at IS NULL
        WHERE ir.referred_at >= ${fromTs}
          AND ir.referred_at < ${toTs}
          ${imnciFacilityClause}
      )
      SELECT sector, count(*)::int AS count
      FROM refs
      GROUP BY sector
      ORDER BY count DESC
    `);

    return result.rows.map((r) => ({
      sector: r.sector ?? "unknown",
      count: Number(r.count),
    }));
  }

  // ---------------------------------------------------------------------------
  // Telehealth
  // ---------------------------------------------------------------------------

  public async telehealthRequests(
    f: BaseAnalyticsFilter,
    service: TelehealthService,
  ): Promise<RequestedPerformed> {
    const serviceClause: SQL | undefined =
      service && SERVICE_VALUES[service]
        ? sql`lower(${appointments.service}) IN (${sql.join(
            SERVICE_VALUES[service].map((v) => sql`${v.toLowerCase()}`),
            sql`, `,
          )})`
        : undefined;

    const [requestedRows, performedRows] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(appointments)
        .where(
          andFilters(
            gte(appointments.date, toDateStr(f.from)),
            lt(appointments.date, toDateStr(f.toExclusive)),
            isNull(appointments.deletedAt),
            withFacility(appointments.facilityId, f.facilityId),
            serviceClause,
          ),
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(telehealth_sessions)
        .innerJoin(
          appointments,
          eq(telehealth_sessions.appointmentId, appointments.id),
        )
        .where(
          andFilters(
            isNotNull(telehealth_sessions.endedAt),
            gte(telehealth_sessions.endedAt, toDate(f.from)),
            lt(telehealth_sessions.endedAt, toDate(f.toExclusive)),
            isNull(appointments.deletedAt),
            withFacility(appointments.facilityId, f.facilityId),
            serviceClause,
          ),
        ),
    ]);

    return {
      requested: requestedRows[0]?.count ?? 0,
      performed: performedRows[0]?.count ?? 0,
    };
  }

  // ---------------------------------------------------------------------------
  // OPD follow-up
  // ---------------------------------------------------------------------------

  public async opdFollowUp(f: BaseAnalyticsFilter): Promise<RequestedPerformed> {
    const baseWhere = andFilters(
      gte(visits.date, toDateStr(f.from)),
      lt(visits.date, toDateStr(f.toExclusive)),
      isNotNull(visits.followUpId),
      isNull(visits.deletedAt),
      withFacility(visits.facilityId, f.facilityId),
    );

    const [requestedRows, performedRows] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(visits).where(baseWhere),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(visits)
        .where(andFilters(baseWhere, eq(visits.status, "finished"))),
    ]);

    return {
      requested: requestedRows[0]?.count ?? 0,
      performed: performedRows[0]?.count ?? 0,
    };
  }

  // ---------------------------------------------------------------------------
  // Morbidity trend
  // ---------------------------------------------------------------------------

  public async morbidityTrend(
    f: BaseAnalyticsFilter,
    limit: number,
  ): Promise<MorbiditySeries> {
    const facilityClause = f.facilityId
      ? sql`AND v.facility_id = ${f.facilityId}::uuid`
      : sql``;
    const fromStr = toDateStr(f.from);
    const toStr = toDateStr(f.toExclusive);

    const topCodes = await db.execute<{
      icd_code: string | null;
      description: string;
      count: number;
    }>(sql`
      SELECT cd.icd_code,
             min(cd.description) AS description,
             count(DISTINCT cd.patient_id)::int AS count
      FROM confirm_diagnoses cd
      JOIN visits v ON v.id = cd.visit_id
      WHERE v.date >= ${fromStr}
        AND v.date < ${toStr}
        AND cd.deleted_at IS NULL
        AND v.deleted_at IS NULL
        ${facilityClause}
      GROUP BY cd.icd_code
      ORDER BY count DESC, cd.icd_code NULLS LAST
      LIMIT ${limit}
    `);

    if (topCodes.rows.length === 0) {
      return { series: [] };
    }

    const codes = topCodes.rows.map((r) => r.icd_code);
    const codePlaceholders = sql.join(
      codes.map((c) => sql`${c}`),
      sql`, `,
    );

    const daily = await db.execute<{
      icd_code: string | null;
      day: string;
      count: number;
    }>(sql`
      SELECT cd.icd_code,
             to_char(v.date::date, 'YYYY-MM-DD') AS day,
             count(DISTINCT cd.patient_id)::int AS count
      FROM confirm_diagnoses cd
      JOIN visits v ON v.id = cd.visit_id
      WHERE v.date >= ${fromStr}
        AND v.date < ${toStr}
        AND cd.deleted_at IS NULL
        AND v.deleted_at IS NULL
        AND cd.icd_code IN (${codePlaceholders})
        ${facilityClause}
      GROUP BY cd.icd_code, day
      ORDER BY day ASC
    `);

    const byCode = new Map<string | null, DailyPoint[]>();
    for (const row of daily.rows) {
      const arr = byCode.get(row.icd_code) ?? [];
      arr.push({ date: row.day, count: Number(row.count) });
      byCode.set(row.icd_code, arr);
    }

    return {
      series: topCodes.rows.map((r) => ({
        name: r.description ?? r.icd_code ?? "Unknown",
        icdCode: r.icd_code,
        points: byCode.get(r.icd_code) ?? [],
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // Demographics
  // ---------------------------------------------------------------------------

  public async demographicsByGender(
    f: BaseAnalyticsFilter,
  ): Promise<GenderTotals> {
    const rows = await db
      .select({
        gender: persons.gender,
        count: sql<number>`count(*)::int`,
      })
      .from(patients)
      .innerJoin(persons, eq(patients.personId, persons.id))
      .where(
        andFilters(
          gte(patients.createdAt, toDate(f.from)),
          lt(patients.createdAt, toDate(f.toExclusive)),
          isNull(patients.deletedAt),
          withFacility(patients.facilityId, f.facilityId),
        ),
      )
      .groupBy(persons.gender);

    const totals: GenderTotals = { male: 0, female: 0, other: 0 };
    for (const r of rows) {
      if (r.gender === "male") totals.male = r.count;
      else if (r.gender === "female") totals.female = r.count;
      else totals.other += r.count;
    }
    return totals;
  }

  public async patientsByEthnicity(
    f: BaseAnalyticsFilter,
  ): Promise<CasteBucket[]> {
    const rows = await db
      .select({
        caste: persons.caste,
        count: sql<number>`count(*)::int`,
      })
      .from(patients)
      .innerJoin(persons, eq(patients.personId, persons.id))
      .where(
        andFilters(
          gte(patients.createdAt, toDate(f.from)),
          lt(patients.createdAt, toDate(f.toExclusive)),
          isNull(patients.deletedAt),
          withFacility(patients.facilityId, f.facilityId),
        ),
      )
      .groupBy(persons.caste)
      .orderBy(desc(sql`count(*)`));

    return rows.map((r) => ({ caste: r.caste, count: r.count }));
  }

  public async patientsByMunicipality(
    f: BaseAnalyticsFilter,
  ): Promise<MunicipalityBucket[]> {
    const rows = await db
      .select({
        municipalityId: person_addresses.municipalityId,
        nameJson: municipalities.name,
        count: sql<number>`count(distinct ${patients.id})::int`,
      })
      .from(patients)
      .innerJoin(persons, eq(patients.personId, persons.id))
      .innerJoin(
        person_addresses,
        and(
          eq(person_addresses.personId, persons.id),
          eq(person_addresses.isPrimary, true),
        ),
      )
      .leftJoin(
        municipalities,
        eq(municipalities.id, person_addresses.municipalityId),
      )
      .where(
        andFilters(
          gte(patients.createdAt, toDate(f.from)),
          lt(patients.createdAt, toDate(f.toExclusive)),
          isNull(patients.deletedAt),
          withFacility(patients.facilityId, f.facilityId),
        ),
      )
      .groupBy(person_addresses.municipalityId, municipalities.name)
      .orderBy(desc(sql`count(distinct ${patients.id})`));

    return rows.map((r) => ({
      municipalityId: r.municipalityId,
      name: extractName(r.nameJson),
      count: r.count,
    }));
  }

  public async patientsByFacility(
    f: BaseAnalyticsFilter,
  ): Promise<FacilityBucket[]> {
    const rows = await db
      .select({
        facilityId: patients.facilityId,
        name: health_facilities.name,
        count: sql<number>`count(*)::int`,
      })
      .from(patients)
      .leftJoin(
        health_facilities,
        eq(patients.facilityId, health_facilities.id),
      )
      .where(
        andFilters(
          gte(patients.createdAt, toDate(f.from)),
          lt(patients.createdAt, toDate(f.toExclusive)),
          isNull(patients.deletedAt),
          isNotNull(patients.facilityId),
          withFacility(patients.facilityId, f.facilityId),
        ),
      )
      .groupBy(patients.facilityId, health_facilities.name)
      .orderBy(desc(sql`count(*)`));

    return rows.map((r) => ({
      facilityId: r.facilityId!,
      name: r.name ?? "Unknown",
      count: r.count,
    }));
  }

  // ---------------------------------------------------------------------------
  // Top diseases
  // ---------------------------------------------------------------------------

  public async topDiseases(
    f: BaseAnalyticsFilter,
    limit: number,
  ): Promise<DiseaseBucket[]> {
    const rows = await db
      .select({
        icdCode: confirm_diagnoses.icdCode,
        description: sql<string>`min(${confirm_diagnoses.description})`,
        count: sql<number>`count(*)::int`,
      })
      .from(confirm_diagnoses)
      .innerJoin(visits, eq(confirm_diagnoses.visitId, visits.id))
      .where(
        andFilters(
          gte(visits.date, toDateStr(f.from)),
          lt(visits.date, toDateStr(f.toExclusive)),
          isNull(confirm_diagnoses.deletedAt),
          isNull(visits.deletedAt),
          withFacility(visits.facilityId, f.facilityId),
        ),
      )
      .groupBy(confirm_diagnoses.icdCode)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    return rows.map((r) => ({
      icdCode: r.icdCode,
      description: r.description,
      count: r.count,
    }));
  }

  // ---------------------------------------------------------------------------
  // Age × gender stacked distribution
  // ---------------------------------------------------------------------------

  public async ageGenderDistribution(
    f: BaseAnalyticsFilter,
  ): Promise<AgeGenderBucket[]> {
    const facilityClause = f.facilityId
      ? sql`AND p.facility_id = ${f.facilityId}::uuid`
      : sql``;

    const result = await db.execute<{
      age_range: string;
      gender: "male" | "female" | "other" | null;
      count: number;
    }>(sql`
      WITH bucketed AS (
        SELECT
          CASE
            WHEN per.birth_date IS NULL THEN 'unknown'
            WHEN extract(year from age(per.birth_date)) <= 10 THEN '0-10'
            WHEN extract(year from age(per.birth_date)) <= 20 THEN '11-20'
            WHEN extract(year from age(per.birth_date)) <= 30 THEN '21-30'
            WHEN extract(year from age(per.birth_date)) <= 40 THEN '31-40'
            WHEN extract(year from age(per.birth_date)) <= 50 THEN '41-50'
            WHEN extract(year from age(per.birth_date)) <= 60 THEN '51-60'
            WHEN extract(year from age(per.birth_date)) <= 70 THEN '61-70'
            WHEN extract(year from age(per.birth_date)) <= 80 THEN '71-80'
            WHEN extract(year from age(per.birth_date)) <= 90 THEN '81-90'
            ELSE '91-100'
          END AS age_range,
          per.gender::text AS gender
        FROM patients p
        JOIN persons per ON per.id = p.person_id
        WHERE p.created_at >= ${f.from}
          AND p.created_at < ${f.toExclusive}
          AND p.deleted_at IS NULL
          ${facilityClause}
      )
      SELECT age_range, gender, count(*)::int AS count
      FROM bucketed
      GROUP BY age_range, gender
    `);

    const order = [
      "0-10",
      "11-20",
      "21-30",
      "31-40",
      "41-50",
      "51-60",
      "61-70",
      "71-80",
      "81-90",
      "91-100",
      "unknown",
    ];
    const map = new Map<string, AgeGenderBucket>();
    for (const range of order) {
      map.set(range, { ageRange: range, male: 0, female: 0, other: 0 });
    }
    for (const row of result.rows) {
      const bucket = map.get(row.age_range) ?? {
        ageRange: row.age_range,
        male: 0,
        female: 0,
        other: 0,
      };
      const c = Number(row.count);
      if (row.gender === "male") bucket.male += c;
      else if (row.gender === "female") bucket.female += c;
      else bucket.other += c;
      map.set(row.age_range, bucket);
    }

    return order
      .map((r) => map.get(r)!)
      .filter((b) => b.male + b.female + b.other > 0);
  }

  // ---------------------------------------------------------------------------
  // Visits daily trend
  // ---------------------------------------------------------------------------

  public async visitsDailyTrend(
    f: BaseAnalyticsFilter,
  ): Promise<DailyPoint[]> {
    const rows = await db
      .select({
        date: sql<string>`to_char(${visits.date}::date, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(visits)
      .where(
        andFilters(
          gte(visits.date, toDateStr(f.from)),
          lt(visits.date, toDateStr(f.toExclusive)),
          isNull(visits.deletedAt),
          withFacility(visits.facilityId, f.facilityId),
        ),
      )
      .groupBy(sql`${visits.date}::date`)
      .orderBy(sql`${visits.date}::date`);

    return rows.map((r) => ({ date: r.date, count: r.count }));
  }

  // ---------------------------------------------------------------------------
  // Admin-only system views
  // ---------------------------------------------------------------------------

  public async facilityLeaderboard(
    f: BaseAnalyticsFilter,
  ): Promise<FacilityLeaderboardRow[]> {
    const fromTs = f.from;
    const toTs = f.toExclusive;
    const fromStr = toDateStr(f.from);
    const toStr = toDateStr(f.toExclusive);

    const result = await db.execute<{
      facility_id: string;
      name: string;
      total_patients: number;
      opd: number;
      immunization: number;
      maternal: number;
      telehealth_requested: number;
      telehealth_performed: number;
    }>(sql`
      SELECT
        hf.id AS facility_id,
        hf.name AS name,
        COALESCE((
          SELECT count(*)::int FROM patients p
          WHERE p.facility_id = hf.id
            AND p.created_at >= ${fromTs}
            AND p.created_at < ${toTs}
            AND p.deleted_at IS NULL
        ), 0) AS total_patients,
        COALESCE((
          SELECT count(*)::int FROM visits v
          WHERE v.facility_id = hf.id
            AND v.date >= ${fromStr}
            AND v.date < ${toStr}
            AND lower(v.service) = 'opd'
            AND v.deleted_at IS NULL
        ), 0) AS opd,
        COALESCE((
          SELECT count(*)::int
          FROM immunization_histories ih
          JOIN child_immunizations ci ON ci.id = ih.child_immunization_id
          WHERE ci.facility_id = hf.id
            AND ih.date >= ${fromTs}
            AND ih.date < ${toTs}
            AND ih.deleted_at IS NULL
            AND ci.deleted_at IS NULL
        ), 0) AS immunization,
        COALESCE((
          SELECT
            COALESCE((SELECT count(*)::int FROM antenatal_cares ac
              JOIN patients p ON p.id = ac.patient_id
              WHERE p.facility_id = hf.id
                AND ac.anc_visit_date >= ${fromStr}
                AND ac.anc_visit_date < ${toStr}
                AND ac.deleted_at IS NULL), 0)
          + COALESCE((SELECT count(*)::int FROM deliveries d
              JOIN patients p ON p.id = d.patient_id
              WHERE p.facility_id = hf.id
                AND d.delivery_date >= ${fromStr}
                AND d.delivery_date < ${toStr}
                AND d.deleted_at IS NULL), 0)
          + COALESCE((SELECT count(*)::int FROM postnatal_cares pnc
              JOIN patients p ON p.id = pnc.patient_id
              WHERE p.facility_id = hf.id
                AND pnc.visit_date >= ${fromStr}
                AND pnc.visit_date < ${toStr}
                AND pnc.deleted_at IS NULL), 0)
        ), 0) AS maternal,
        COALESCE((
          SELECT count(*)::int FROM appointments a
          WHERE a.facility_id = hf.id
            AND a.date >= ${fromStr}
            AND a.date < ${toStr}
            AND a.deleted_at IS NULL
        ), 0) AS telehealth_requested,
        COALESCE((
          SELECT count(*)::int
          FROM telehealth_sessions ts
          JOIN appointments a ON a.id = ts.appointment_id
          WHERE a.facility_id = hf.id
            AND ts.ended_at IS NOT NULL
            AND ts.ended_at >= ${fromTs}
            AND ts.ended_at < ${toTs}
            AND a.deleted_at IS NULL
        ), 0) AS telehealth_performed
      FROM health_facilities hf
      WHERE hf.deleted_at IS NULL
      ORDER BY total_patients DESC, hf.name ASC
    `);

    return result.rows.map((r) => ({
      facilityId: r.facility_id,
      name: r.name,
      totalPatients: Number(r.total_patients),
      opd: Number(r.opd),
      immunization: Number(r.immunization),
      maternal: Number(r.maternal),
      telehealthRequested: Number(r.telehealth_requested),
      telehealthPerformed: Number(r.telehealth_performed),
    }));
  }

  public async systemTotals(f: BaseAnalyticsFilter): Promise<SystemTotals> {
    const [
      facilitiesRow,
      patientsRow,
      opdRow,
      immunizationRow,
      maternal,
    ] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(health_facilities)
        .where(isNull(health_facilities.deletedAt)),
      this.totalPatients(f),
      this.totalOpd(f),
      this.totalImmunization(f),
      this.totalMaternal(f),
    ]);

    return {
      totalFacilities: facilitiesRow[0]?.count ?? 0,
      totalPatients: patientsRow.total,
      totalOpd: opdRow.total,
      totalImmunization: immunizationRow.total,
      totalMaternal: maternal.total,
    };
  }
}

function extractName(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.en === "string") return v.en;
  if (typeof v.np === "string") return v.np;
  return null;
}
