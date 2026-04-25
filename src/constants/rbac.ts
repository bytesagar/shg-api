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
    "patient:read:own",
    "patient:update:own:limited",
    "observation:read:own",
    "observation:create:self-reported",
    "appointment:read:own",
    "appointment:create",
    "appointment:update:own:cancel",
    "pregnancy:read:own",
    "immunization:read:own",
    "medication:read:own",
    "consent:read:own",
    "consent:create:own",
  ],
  [RBAC_ROLES.CHW]: [
    "patient:read:ward",
    "patient:create",
    "patient:update:ward",
    "observation:read:ward",
    "observation:create",
    "appointment:read:ward",
    "appointment:create",
    "appointment:update:ward",
    "pregnancy:read:ward",
    "pregnancy:create",
    "pregnancy:update",
    "immunization:read:ward",
    "immunization:create",
    "family-planning:read:ward",
    "family-planning:create",
    "family-planning:update",
    "consent:read:ward",
    "consent:create",
    "consent:update",
  ],
  [RBAC_ROLES.NURSE]: [
    "patient:read:facility",
    "patient:create",
    "patient:update:facility",
    "observation:read:facility",
    "observation:create",
    "observation:update",
    "appointment:read:facility",
    "appointment:create",
    "appointment:update",
    "pregnancy:read:facility",
    "pregnancy:create",
    "pregnancy:update",
    "immunization:read:facility",
    "immunization:create",
    "immunization:update",
    "medication:read:facility",
    "family-planning:read:facility",
    "family-planning:create",
    "family-planning:update",
    "consent:read:facility",
    "consent:create",
    "consent:update",
  ],
  [RBAC_ROLES.DOCTOR]: [
    "patient:read:all",
    "patient:create",
    "patient:update",
    "observation:read:all",
    "observation:create",
    "observation:update",
    "appointment:read:all",
    "appointment:create",
    "appointment:update",
    "pregnancy:read:all",
    "pregnancy:create",
    "pregnancy:update",
    "immunization:read:all",
    "immunization:create",
    "immunization:update",
    "medication:read:all",
    "medication:create",
    "medication:update",
    "family-planning:read:all",
    "family-planning:create",
    "family-planning:update",
    "consent:read:all",
    "consent:create",
    "consent:update",
  ],
  [RBAC_ROLES.ADMIN]: [
    "patient:read:all",
    "patient:create",
    "patient:update",
    "observation:read:all",
    "observation:create",
    "observation:update",
    "appointment:read:all",
    "appointment:create",
    "appointment:update",
    "pregnancy:read:all",
    "pregnancy:create",
    "pregnancy:update",
    "immunization:read:all",
    "immunization:create",
    "immunization:update",
    "medication:read:all",
    "medication:create",
    "medication:update",
    "family-planning:read:all",
    "family-planning:create",
    "family-planning:update",
    "consent:read:all",
    "consent:create",
    "consent:update",
    "user:read:all",
    "user:create",
    "user:update",
    "facility:read:all",
    "facility:create",
    "facility:update",
    "audit:read:all",
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

