export const RBAC_ROLES = {
  PATIENT: "patient",
  CHW: "chw",
  NURSE: "nurse",
  ADMIN: "admin",
  DOCTOR: "doctor",
  HF_USER: "hfuser",
  FCHV_USER: "fchvuser",
  MUNICIPALITY_USER: "municipalityuser",
  PALIKA: "palika",
  USER: "user",
  FACILITY_LEGACY: "facility",
} as const;

export const ROLE_ALIAS_MAP: Record<string, string> = {
  facility: RBAC_ROLES.HF_USER,
  municipality: RBAC_ROLES.MUNICIPALITY_USER,
  palika: RBAC_ROLES.MUNICIPALITY_USER,
};

export function normalizeRole(role?: string | null): string | undefined {
  if (!role) return undefined;
  const normalized = role.trim().toLowerCase();
  return ROLE_ALIAS_MAP[normalized] ?? normalized;
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
  RBAC_ROLES.PALIKA,
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
  ],
  [RBAC_ROLES.DOCTOR]: [
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
  [RBAC_ROLES.PALIKA]: [],
  [RBAC_ROLES.USER]: [],
  [RBAC_ROLES.FACILITY_LEGACY]: [],
};

ROLE_PERMISSIONS[RBAC_ROLES.HF_USER] = ROLE_PERMISSIONS[RBAC_ROLES.NURSE];
ROLE_PERMISSIONS[RBAC_ROLES.FCHV_USER] = ROLE_PERMISSIONS[RBAC_ROLES.CHW];
ROLE_PERMISSIONS[RBAC_ROLES.MUNICIPALITY_USER] = ROLE_PERMISSIONS[RBAC_ROLES.ADMIN];
ROLE_PERMISSIONS[RBAC_ROLES.PALIKA] = ROLE_PERMISSIONS[RBAC_ROLES.MUNICIPALITY_USER];
ROLE_PERMISSIONS[RBAC_ROLES.FACILITY_LEGACY] = ROLE_PERMISSIONS[RBAC_ROLES.HF_USER];
ROLE_PERMISSIONS[RBAC_ROLES.USER] = ROLE_PERMISSIONS[RBAC_ROLES.PATIENT];

export function getPermissionsForRole(role?: string | null): string[] {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) return [];
  return [...(ROLE_PERMISSIONS[normalizedRole] ?? [])];
}

