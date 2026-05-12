import { RBAC_ROLES } from "../../../constants/rbac";
import { buildSearchScope } from "../search.scope";
import type { ScopeContext } from "../types";

jest.mock("../../../db", () => ({
  db: {
    select: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { db } = require("../../../db") as { db: { select: jest.Mock } };

const ctxFor = (overrides: Partial<ScopeContext>): ScopeContext => ({
  userId: "user-1",
  role: RBAC_ROLES.USER,
  facilityId: "fac-1",
  municipalityId: null,
  ...overrides,
});

// Build the standard Drizzle query mock chain that buildSearchScope uses for
// the FCHV branch (db.select().from().where()).
const mockFchvAssignedRows = (rows: Array<{ patientId: string }>) => {
  db.select.mockImplementationOnce(() => ({
    from: () => ({
      where: () => Promise.resolve(rows),
    }),
  }));
};

describe("buildSearchScope", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("admin: no facility filter, honours adminFacilityOverride", async () => {
    const scope = await buildSearchScope(
      ctxFor({ role: RBAC_ROLES.ADMIN, facilityId: null }),
      "facility-override-1",
    );
    expect(scope.facilityIdFilter).toBe("facility-override-1");
    expect(scope.assignedPatientIds).toBeNull();
    expect(scope.ownAppointmentsOnlyForUserId).toBeNull();
    expect(scope.ownDoctorBoostUserId).toBeNull();
    expect(db.select).not.toHaveBeenCalled();
  });

  it("admin without override: facility filter is null", async () => {
    const scope = await buildSearchScope(
      ctxFor({ role: RBAC_ROLES.ADMIN, facilityId: null }),
      null,
    );
    expect(scope.facilityIdFilter).toBeNull();
  });

  it("hfuser: facility-bound, no doctor boost, no caseload", async () => {
    const scope = await buildSearchScope(ctxFor({ role: RBAC_ROLES.HF_USER }), null);
    expect(scope.facilityIdFilter).toBe("fac-1");
    expect(scope.assignedPatientIds).toBeNull();
    expect(scope.ownAppointmentsOnlyForUserId).toBeNull();
    expect(scope.ownDoctorBoostUserId).toBeNull();
  });

  it("doctor: facility-bound + ownDoctorBoostUserId set to userId", async () => {
    const scope = await buildSearchScope(ctxFor({ role: RBAC_ROLES.DOCTOR }), null);
    expect(scope.facilityIdFilter).toBe("fac-1");
    expect(scope.ownDoctorBoostUserId).toBe("user-1");
    expect(scope.ownAppointmentsOnlyForUserId).toBeNull();
  });

  it("fchvuser: facility-bound, caseload loaded and deduped", async () => {
    // Two rows for the same patient (same patient with multiple pregnancies).
    mockFchvAssignedRows([
      { patientId: "patient-A" },
      { patientId: "patient-B" },
      { patientId: "patient-A" },
    ]);
    const scope = await buildSearchScope(
      ctxFor({ role: RBAC_ROLES.FCHV_USER }),
      null,
    );
    expect(scope.facilityIdFilter).toBe("fac-1");
    expect(scope.assignedPatientIds).toEqual(
      expect.arrayContaining(["patient-A", "patient-B"]),
    );
    expect(scope.assignedPatientIds).toHaveLength(2);
  });

  it("fchvuser with empty caseload: assignedPatientIds is []", async () => {
    mockFchvAssignedRows([]);
    const scope = await buildSearchScope(
      ctxFor({ role: RBAC_ROLES.FCHV_USER }),
      null,
    );
    expect(scope.assignedPatientIds).toEqual([]);
  });

  it("user: ownAppointmentsOnlyForUserId set, no doctor boost", async () => {
    const scope = await buildSearchScope(ctxFor({ role: RBAC_ROLES.USER }), null);
    expect(scope.ownAppointmentsOnlyForUserId).toBe("user-1");
    expect(scope.facilityIdFilter).toBe("fac-1");
    expect(scope.ownDoctorBoostUserId).toBeNull();
  });

  it("patient: treated like `user` (self-only)", async () => {
    const scope = await buildSearchScope(ctxFor({ role: RBAC_ROLES.PATIENT }), null);
    expect(scope.ownAppointmentsOnlyForUserId).toBe("user-1");
  });

  it("non-admin override is ignored (silently)", async () => {
    const scope = await buildSearchScope(
      ctxFor({ role: RBAC_ROLES.HF_USER }),
      "another-facility",
    );
    expect(scope.facilityIdFilter).toBe("fac-1"); // their own facility, not the override
    expect(scope.adminFacilityOverride).toBeNull();
  });

  it("unknown role narrows to zero results", async () => {
    const scope = await buildSearchScope(
      ctxFor({ role: "unknown-role" as never }),
      null,
    );
    expect(scope.assignedPatientIds).toEqual([]);
  });
});
