import {
  ALL_PERMISSIONS,
  effectivePermissions,
  getPermissionsForRole,
  isValidPermission,
} from "./rbac";

describe("rbac catalog", () => {
  it("derives ALL_PERMISSIONS as subject:action strings", () => {
    expect(ALL_PERMISSIONS).toContain("patient:read");
    expect(ALL_PERMISSIONS).toContain("patient:delete");
    expect(ALL_PERMISSIONS).toContain("role:create");
    expect(ALL_PERMISSIONS).toContain("analytics:read");
    expect(ALL_PERMISSIONS).toContain("audit:read");
    // analytics is read-only in the catalog
    expect(ALL_PERMISSIONS).not.toContain("analytics:create");
  });

  it("includes the nav-only subjects", () => {
    expect(ALL_PERMISSIONS).toContain("survey:create");
    expect(ALL_PERMISSIONS).toContain("smsLog:read");
    expect(ALL_PERMISSIONS).toContain("doctorsSummary:read");
    expect(ALL_PERMISSIONS).not.toContain("smsLog:create");
  });
});

describe("seeded role permission sets", () => {
  it("grants admin the full catalog", () => {
    expect(getPermissionsForRole("admin")).toEqual(ALL_PERMISSIONS);
  });

  it("gives every web role a dashboard so the landing page isn't locked out", () => {
    for (const role of [
      "admin",
      "doctor",
      "hfuser",
      "fchvuser",
      "municipalityuser",
      "palika",
    ]) {
      expect(getPermissionsForRole(role)).toContain("dashboard:read");
    }
  });

  it("restricts municipality (no roles management, view-only clients)", () => {
    const perms = getPermissionsForRole("municipalityuser");
    expect(perms).toContain("facility:read");
    expect(perms).toContain("analytics:read");
    expect(perms).toContain("patient:read");
    expect(perms).not.toContain("patient:create");
    expect(perms).not.toContain("role:read");
  });

  it("limits palika to view/search + dashboard/analytics", () => {
    expect(getPermissionsForRole("palika").sort()).toEqual(
      ["analytics:read", "appointment:read", "dashboard:read", "patient:read"].sort(),
    );
  });

  it("gives fchv analytics + surveys but not user management", () => {
    const perms = getPermissionsForRole("fchvuser");
    expect(perms).toContain("analytics:read");
    expect(perms).toContain("survey:create");
    expect(perms).not.toContain("user:read");
  });

  it("keeps doctor client view-only with clinical add/edit", () => {
    const perms = getPermissionsForRole("doctor");
    expect(perms).toContain("patient:read");
    expect(perms).not.toContain("patient:create");
    expect(perms).not.toContain("patient:update");
    expect(perms).toContain("appointment:read");
    expect(perms).not.toContain("appointment:create");
    expect(perms).toContain("observation:create"); // add clinical services
    expect(perms).toContain("survey:update"); // edit service forms
  });
});

describe("isValidPermission", () => {
  it("accepts unscoped catalog permissions", () => {
    expect(isValidPermission("patient:read")).toBe(true);
    expect(isValidPermission("user:delete")).toBe(true);
  });

  it("accepts scoped permissions whose base pair is in the catalog", () => {
    expect(isValidPermission("patient:read:facility")).toBe(true);
    expect(isValidPermission("patient:read:all")).toBe(true);
  });

  it("rejects unknown subjects, actions, and scopes", () => {
    expect(isValidPermission("widget:read")).toBe(false);
    expect(isValidPermission("patient:teleport")).toBe(false);
    expect(isValidPermission("patient:read:galaxy")).toBe(false);
    expect(isValidPermission("patient")).toBe(false);
  });
});

describe("effectivePermissions", () => {
  it("prefers the role record's explicit permissions when present", () => {
    expect(
      effectivePermissions("custom", ["patient:read", "growth:create"]),
    ).toEqual(["patient:read", "growth:create"]);
  });

  it("falls back to the hardcoded map when the record has no permissions", () => {
    expect(effectivePermissions("admin", [])).toEqual(
      getPermissionsForRole("admin"),
    );
    expect(effectivePermissions("admin", null)).toEqual(
      getPermissionsForRole("admin"),
    );
  });

  it("returns an empty list for an unknown role with no explicit permissions", () => {
    expect(effectivePermissions("totally-unknown", [])).toEqual([]);
  });
});
