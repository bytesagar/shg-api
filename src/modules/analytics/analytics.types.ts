export type Scope =
  | { kind: "facility"; facilityId: string }
  /**
   * A geography-resolved set of facilities (province/district/municipality
   * filter). An empty array means "the geography matched no facilities" and
   * must yield zero rows — never silently widen to all.
   */
  | { kind: "facilities"; facilityIds: string[] }
  | { kind: "all" };

/** Optional geography narrowing forwarded by the controller (admin-only). */
export interface GeographyScopeInput {
  facilityId?: string;
  provinceId?: string;
  districtId?: string;
  municipalityId?: string;
}

export interface BaseAnalyticsFilter {
  from: Date;
  toExclusive: Date;
  /**
   * Facility scope for the query:
   *   - `undefined` → all facilities (system-wide)
   *   - `[id]`      → a single facility
   *   - `[a, b, …]` → a resolved set (geography filter)
   *   - `[]`        → matched nothing; the query must return zero rows
   */
  facilityIds?: string[];
}

export interface TotalCount {
  total: number;
}

export interface RequestedPerformed {
  requested: number;
  performed: number;
}

export interface ServiceBucket {
  service: string;
  count: number;
}

export interface SectorBucket {
  sector: string;
  count: number;
}

export interface CasteBucket {
  caste: string | null;
  count: number;
}

export interface MunicipalityBucket {
  municipalityId: string | null;
  name: string | null;
  count: number;
}

export interface FacilityBucket {
  facilityId: string;
  name: string;
  count: number;
}

export interface DiseaseBucket {
  icdCode: string | null;
  description: string;
  count: number;
}

export interface GenderTotals {
  male: number;
  female: number;
  other: number;
}

export interface AgeGenderBucket {
  ageRange: string;
  male: number;
  female: number;
  other: number;
}

export interface DailyPoint {
  date: string;
  count: number;
}

export interface MorbiditySeries {
  series: Array<{
    name: string;
    icdCode: string | null;
    points: DailyPoint[];
  }>;
}

export interface FacilityLeaderboardRow {
  facilityId: string;
  name: string;
  totalPatients: number;
  opd: number;
  immunization: number;
  maternal: number;
  telehealthRequested: number;
  telehealthPerformed: number;
}

export interface SystemTotals {
  totalFacilities: number;
  totalPatients: number;
  totalOpd: number;
  totalImmunization: number;
  totalMaternal: number;
}

/**
 * Row in the doctors-appointment-summary report. One row per doctor
 * who has at least one appointment in the date range.
 *   - `totalAssigned`         appointments assigned to the doctor
 *                             (regardless of status) in the range.
 *   - `totalConsultation`     subset of those that were actually
 *                             delivered — appointment status
 *                             `completed` OR a linked visit.
 *   - `consultationDurationSeconds`  cumulative duration across the
 *                             linked telehealth_sessions; 0 when no
 *                             session was recorded (in-person visits).
 */
export interface DoctorAppointmentSummaryRow {
  doctorId: string;
  doctorFirstName: string | null;
  doctorLastName: string | null;
  facilityId: string | null;
  facilityName: string | null;
  totalAssigned: number;
  totalConsultation: number;
  consultationDurationSeconds: number;
}
