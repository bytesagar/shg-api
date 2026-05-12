import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../db";
import { pregnancies } from "../../db/schema";
import { RBAC_ROLES, normalizeRole } from "../../constants/rbac";
import type { ScopeContext, SearchRole } from "./types";

/**
 * Resolved per-request scope. Computed once at the start of `searchAll`
 * from `ScopeContext` + role rules; consumed by every runner. Keeping the
 * branching here means each runner only has to AND in the predicates
 * relevant to its table - it never has to re-check role.
 */
export interface SearchScope {
  ctx: ScopeContext;
  /**
   * Facility predicate to AND on every facility-scoped table.
   *   null   -> no filter (admin)
   *   string -> exact match
   */
  facilityIdFilter: string | null;
  /**
   * Only set for FCHV. List of patient IDs the FCHV is responsible for
   * (derived from `pregnancies.assigned_fchv_id` until the
   * `fchv_patient_assignments` Phase 2 prereq lands). Empty array means
   * "no assigned patients" -> every runner returns zero results.
   */
  assignedPatientIds: string[] | null;
  /**
   * For `user` / `patient` roles: only match appointments where this user
   * is the patient (or owner). Null otherwise.
   */
  ownAppointmentsOnlyForUserId: string | null;
  /**
   * For `doctor`: recency-boost own patients. The runners that touch a
   * `doctor_id`/`created_by` column use this for ranking, not filtering.
   */
  ownDoctorBoostUserId: string | null;
  /**
   * `admin` only. When admin passes `?facility_id=…`, we honour it. Other
   * roles silently get this stripped before scope construction.
   */
  adminFacilityOverride: string | null;
}

const FACILITY_BOUND_ROLES: ReadonlySet<SearchRole> = new Set([
  RBAC_ROLES.HF_USER,
  RBAC_ROLES.DOCTOR,
  RBAC_ROLES.NURSE,
  RBAC_ROLES.CHW,
  RBAC_ROLES.FCHV_USER,
  RBAC_ROLES.MUNICIPALITY_USER,
  RBAC_ROLES.PALIKA,
]);

const SELF_ONLY_ROLES: ReadonlySet<SearchRole> = new Set([
  RBAC_ROLES.USER,
  RBAC_ROLES.PATIENT,
]);

/**
 * Builds the resolved scope from `req.context` and any admin override.
 * Throws nothing - unknown/unsupported roles get zero-result scopes.
 */
export async function buildSearchScope(
  ctx: ScopeContext,
  adminFacilityOverride: string | null,
): Promise<SearchScope> {
  const role = normalizeRole(ctx.role) as SearchRole | undefined;

  // ----- admin: unrestricted; honour ?facility_id ---------------------------
  if (role === RBAC_ROLES.ADMIN) {
    return {
      ctx,
      facilityIdFilter: adminFacilityOverride ?? null,
      assignedPatientIds: null,
      ownAppointmentsOnlyForUserId: null,
      ownDoctorBoostUserId: null,
      adminFacilityOverride,
    };
  }

  // ----- fchv: facility + assigned patients only ---------------------------
  if (role === RBAC_ROLES.FCHV_USER) {
    const assigned = await loadAssignedPatientIds(ctx.userId);
    return {
      ctx,
      facilityIdFilter: ctx.facilityId,
      assignedPatientIds: assigned,
      ownAppointmentsOnlyForUserId: null,
      ownDoctorBoostUserId: null,
      adminFacilityOverride: null,
    };
  }

  // ----- doctor: facility scope + recency boost on own patients ------------
  if (role === RBAC_ROLES.DOCTOR) {
    return {
      ctx,
      facilityIdFilter: ctx.facilityId,
      assignedPatientIds: null,
      ownAppointmentsOnlyForUserId: null,
      ownDoctorBoostUserId: ctx.userId,
      adminFacilityOverride: null,
    };
  }

  // ----- user/patient: only own appointments -------------------------------
  if (role && SELF_ONLY_ROLES.has(role)) {
    return {
      ctx,
      facilityIdFilter: ctx.facilityId, // best-effort; many self-roles have one
      assignedPatientIds: null,
      ownAppointmentsOnlyForUserId: ctx.userId,
      ownDoctorBoostUserId: null,
      adminFacilityOverride: null,
    };
  }

  // ----- facility-bound (hfuser, nurse, chw, municipalityuser, palika) -----
  if (role && FACILITY_BOUND_ROLES.has(role)) {
    return {
      ctx,
      facilityIdFilter: ctx.facilityId,
      assignedPatientIds: null,
      ownAppointmentsOnlyForUserId: null,
      ownDoctorBoostUserId: null,
      adminFacilityOverride: null,
    };
  }

  // ----- unknown role: zero-result fallback --------------------------------
  // Don't 403 - the auth middleware already gated, this is just "we don't
  // know how to scope you", so we narrow to nothing.
  return {
    ctx,
    facilityIdFilter: ctx.facilityId,
    assignedPatientIds: [],
    ownAppointmentsOnlyForUserId: null,
    ownDoctorBoostUserId: null,
    adminFacilityOverride: null,
  };
}

/**
 * Loads the FCHV's caseload. The plan's Phase 2 prereq calls for a dedicated
 * `fchv_patient_assignments` table; until that lands, we infer assignment
 * from `pregnancies.assigned_fchv_id` (active pregnancies only). This is
 * narrow but correct for the maternal-health flow that FCHVs use today.
 */
async function loadAssignedPatientIds(fchvUserId: string): Promise<string[]> {
  const rows = await db
    .select({ patientId: pregnancies.patientId })
    .from(pregnancies)
    .where(
      and(
        eq(pregnancies.assignedFchvId, fchvUserId),
        isNull(pregnancies.deletedAt),
      ),
    );
  // Dedupe; a patient can have multiple pregnancy rows over time.
  return Array.from(new Set(rows.map((r) => r.patientId)));
}
