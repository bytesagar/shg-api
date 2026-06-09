export const RBAC_ROLES = {
  PATIENT: "patient",
  CHW: "chw",
  NURSE: "nurse",
  ADMIN: "admin",
  DOCTOR: "doctor",
  HF_USER: "hfuser",
  FCHV_USER: "fchvuser",
  MUNICIPALITY_USER: "municipalityuser",
  USER: "user",
  FACILITY_LEGACY: "facility",
} as const;

export const ROLE_ALIAS_MAP: Record<string, string> = {
  facility: RBAC_ROLES.HF_USER,
  municipality: RBAC_ROLES.MUNICIPALITY_USER,
  // `palika` was a separate role but is identical in intent to
  // `municipalityuser`; it's been removed and is now aliased so any lingering
  // `palika` role still resolves to municipality access.
  palika: RBAC_ROLES.MUNICIPALITY_USER,
};

export function normalizeRole(role?: string | null): string | undefined {
  if (!role) return undefined;
  const normalized = role.trim().toLowerCase();
  return ROLE_ALIAS_MAP[normalized] ?? normalized;
}

/**
 * True when a role (any alias/casing) is the doctor role. v2 relies solely on
 * `role` for behavior — never `users.userType` — so this is the single source
 * of truth for "is this user a doctor".
 */
export function isDoctor(role?: string | null): boolean {
  return normalizeRole(role) === RBAC_ROLES.DOCTOR;
}

export const AUTHENTICATED_ROLES = [
  RBAC_ROLES.PATIENT,
  RBAC_ROLES.CHW,
  RBAC_ROLES.NURSE,
  RBAC_ROLES.ADMIN,
  RBAC_ROLES.DOCTOR,
  RBAC_ROLES.HF_USER,
  RBAC_ROLES.FCHV_USER,
  RBAC_ROLES.MUNICIPALITY_USER,
  RBAC_ROLES.USER,
  RBAC_ROLES.FACILITY_LEGACY,
] as const;

export const CLINICAL_READ_ROLES = [...AUTHENTICATED_ROLES] as const;

export const CLINICAL_WRITE_ROLES = [
  RBAC_ROLES.ADMIN,
  RBAC_ROLES.DOCTOR,
  RBAC_ROLES.HF_USER,
] as const;

export const COMMUNITY_WRITE_ROLES = [
  ...CLINICAL_WRITE_ROLES,
  RBAC_ROLES.FCHV_USER,
] as const;

export const FACILITY_MANAGEMENT_ROLES = [
  RBAC_ROLES.ADMIN,
  RBAC_ROLES.HF_USER,
  RBAC_ROLES.MUNICIPALITY_USER,
] as const;

export const ADMIN_ONLY_ROLES = [RBAC_ROLES.ADMIN] as const;

export const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  [RBAC_ROLES.PATIENT]: [
    "patient:read",
    "patient:update",
    "observation:read",
    "observation:create",
    "appointment:read",
    "appointment:create",
    "appointment:update",
    "pregnancy:read",
    "immunization:read",
    "medication:read",
    "consent:read",
    "consent:create",
  ],
  [RBAC_ROLES.CHW]: [
    "patient:read",
    "patient:create",
    "patient:update",
    "observation:read",
    "observation:create",
    "appointment:read",
    "appointment:create",
    "appointment:update",
    "pregnancy:read",
    "pregnancy:create",
    "pregnancy:update",
    "immunization:read",
    "immunization:create",
    "growth:read",
    "growth:create",
    "growth:update",
    "family-planning:read",
    "family-planning:create",
    "family-planning:update",
    "consent:read",
    "consent:create",
    "consent:update",
    "dashboard:read",
    "analytics:read",
    "labTest:read",
    "survey:read",
    "survey:create",
    "survey:update",
  ],
  [RBAC_ROLES.NURSE]: [
    "patient:read",
    "patient:create",
    "patient:update",
    "observation:read",
    "observation:create",
    "observation:update",
    "appointment:read",
    "appointment:create",
    "appointment:update",
    "pregnancy:read",
    "pregnancy:create",
    "pregnancy:update",
    "immunization:read",
    "immunization:create",
    "immunization:update",
    "growth:read",
    "growth:create",
    "growth:update",
    "medication:read",
    "family-planning:read",
    "family-planning:create",
    "family-planning:update",
    "consent:read",
    "consent:create",
    "consent:update",
    "dashboard:read",
    "user:read",
    "user:create",
    "user:update",
    "labTest:read",
    "survey:read",
    "survey:create",
    "survey:update",
  ],
  [RBAC_ROLES.DOCTOR]: [
    // Per the toolkit: doctors *view* clients and *add/edit clinical services*
    // — they don't register clients or schedule appointments.
    "patient:read",
    "observation:read",
    "observation:create",
    "observation:update",
    "appointment:read",
    "pregnancy:read",
    "pregnancy:create",
    "pregnancy:update",
    "immunization:read",
    "immunization:create",
    "immunization:update",
    "growth:read",
    "growth:create",
    "growth:update",
    "medication:read",
    "medication:create",
    "medication:update",
    "family-planning:read",
    "family-planning:create",
    "family-planning:update",
    "consent:read",
    "consent:create",
    "consent:update",
    "dashboard:read",
    // Doctors are global, cross-facility clinicians: they do not run surveys
    // (FCHV/CHW/facility work) and have no access to the lab-test/service
    // registry. Both `survey:*` and `labTest:*` are intentionally omitted.
  ],
  [RBAC_ROLES.ADMIN]: [
    "patient:read",
    "patient:create",
    "patient:update",
    "observation:read",
    "observation:create",
    "observation:update",
    "appointment:read",
    "appointment:create",
    "appointment:update",
    "pregnancy:read",
    "pregnancy:create",
    "pregnancy:update",
    "immunization:read",
    "immunization:create",
    "immunization:update",
    "growth:read",
    "growth:create",
    "growth:update",
    "medication:read",
    "medication:create",
    "medication:update",
    "family-planning:read",
    "family-planning:create",
    "family-planning:update",
    "consent:read",
    "consent:create",
    "consent:update",
    "user:read",
    "user:create",
    "user:update",
    "facility:read",
    "facility:create",
    "facility:update",
    "audit:read",
  ],
  [RBAC_ROLES.HF_USER]: [],
  [RBAC_ROLES.FCHV_USER]: [],
  [RBAC_ROLES.MUNICIPALITY_USER]: [],
  [RBAC_ROLES.USER]: [],
  [RBAC_ROLES.FACILITY_LEGACY]: [],
};

ROLE_PERMISSIONS[RBAC_ROLES.HF_USER] = ROLE_PERMISSIONS[RBAC_ROLES.NURSE];
ROLE_PERMISSIONS[RBAC_ROLES.FCHV_USER] = ROLE_PERMISSIONS[RBAC_ROLES.CHW];
// Municipality (palika office) — manage facilities/users within the municipality,
// view-only clients/appointments/roster/analytics. Not admin-equal.
ROLE_PERMISSIONS[RBAC_ROLES.MUNICIPALITY_USER] = [
  "dashboard:read",
  "analytics:read",
  "facility:read",
  "facility:create",
  "facility:update",
  "user:read",
  "user:create",
  "user:update",
  "patient:read",
  "appointment:read",
  "roster:read",
];
ROLE_PERMISSIONS[RBAC_ROLES.FACILITY_LEGACY] = ROLE_PERMISSIONS[RBAC_ROLES.HF_USER];
ROLE_PERMISSIONS[RBAC_ROLES.USER] = ROLE_PERMISSIONS[RBAC_ROLES.PATIENT];

export function getPermissionsForRole(role?: string | null): string[] {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) return [];
  return [...(ROLE_PERMISSIONS[normalizedRole] ?? [])];
}

/**
 * Canonical permission catalog: the full set of `subject:action` permissions a
 * custom role may be granted. This is the authoring/validation source of truth
 * for the role-permission matrix; the hardcoded `ROLE_PERMISSIONS` above remains
 * the fallback for seeded roles whose DB row carries no explicit permissions.
 *
 * Note: a few subjects (`role`, `analytics`, `roster`, `dashboard`) and the
 * `delete` action are included so the product's permission matrix is fully
 * representable, even though no route enforces them yet.
 */
export const PERMISSION_CATALOG = {
  patient: ["read", "create", "update", "delete"],
  appointment: ["read", "create", "update", "delete"],
  user: ["read", "create", "update", "delete"],
  facility: ["read", "create", "update", "delete"],
  role: ["read", "create", "update", "delete"],
  roster: ["read", "create", "update", "delete"],
  analytics: ["read"],
  dashboard: ["read"],
  observation: ["read", "create", "update", "delete"],
  pregnancy: ["read", "create", "update", "delete"],
  immunization: ["read", "create", "update", "delete"],
  medication: ["read", "create", "update", "delete"],
  growth: ["read", "create", "update", "delete"],
  // Global medicine registry (Settings). Read open to clinical roles; write
  // effectively admin-only (no non-admin role lists medicine:*).
  medicine: ["read", "create", "update", "delete"],
  "family-planning": ["read", "create", "update", "delete"],
  consent: ["read", "create", "update", "delete"],
  audit: ["read"],
  survey: ["read", "create", "update", "delete"],
  // Lab test / service catalog (the "Services" area). Read open to facility-side
  // clinical roles; doctors are intentionally excluded — they consume clinical
  // services, they don't manage the lab-test registry.
  labTest: ["read", "create", "update", "delete"],
  smsLog: ["read"],
  doctorsSummary: ["read"],
} as const satisfies Record<string, readonly string[]>;

export const ALL_PERMISSIONS: string[] = Object.entries(PERMISSION_CATALOG).flatMap(
  ([subject, actions]) => actions.map((action) => `${subject}:${action}`),
);

// Admin gets the full catalog (incl. role/analytics/roster/dashboard/survey/etc.).
// Set here because it depends on ALL_PERMISSIONS.
ROLE_PERMISSIONS[RBAC_ROLES.ADMIN] = [...ALL_PERMISSIONS];

const PERMISSION_SET = new Set(ALL_PERMISSIONS);
const PERMISSION_SCOPES = new Set(["all", "facility", "ward", "own"]);

/**
 * Accepts either an unscoped `subject:action` from the catalog or a scoped
 * `subject:action:scope` whose base pair is in the catalog and whose scope is
 * one of the known scopes.
 */
export function isValidPermission(permission: string): boolean {
  if (PERMISSION_SET.has(permission)) return true;
  const parts = permission.split(":");
  if (parts.length === 3 && PERMISSION_SCOPES.has(parts[2])) {
    return PERMISSION_SET.has(`${parts[0]}:${parts[1]}`);
  }
  return false;
}

/**
 * Effective permissions for a user: prefer the explicit permissions stored on
 * their assigned role record; fall back to the hardcoded map by role name when
 * the role has none (seeded roles before backfill, legacy `userType` fallback).
 */
export function effectivePermissions(
  roleName?: string | null,
  rolePermissions?: readonly string[] | null,
): string[] {
  if (rolePermissions && rolePermissions.length > 0) {
    return [...rolePermissions];
  }
  return getPermissionsForRole(roleName);
}

