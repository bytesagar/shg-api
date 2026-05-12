/**
 * Per-runner-per-role scope assertions. Unit-style: mocks `db.select` to
 * capture the Drizzle chain and asserts:
 *   - short-circuit behavior (zero-row scopes never hit the DB)
 *   - context payloads match the plan's Phase 1 entity contract
 *   - the runner returns the empty envelope when scope precludes results
 *
 * What this does NOT cover: whether the SQL actually filters correctly at
 * Postgres. That requires the integration test infra flagged as tech debt.
 */
import { RBAC_ROLES } from "../../../constants/rbac";
import { searchAppointments } from "../runners/appointments.runner";
import { searchEncounters } from "../runners/encounters.runner";
import { searchPatients } from "../runners/patients.runner";
import { searchPractitioners } from "../runners/practitioners.runner";
import { searchVisits } from "../runners/visits.runner";
import type { SearchScope } from "../search.scope";

jest.mock("../../../db", () => ({
  db: {
    select: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { db } = require("../../../db") as { db: { select: jest.Mock } };

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const baseCtx = {
  userId: "user-1",
  facilityId: "fac-1",
  municipalityId: null,
};

const adminScope: SearchScope = {
  ctx: { ...baseCtx, role: RBAC_ROLES.ADMIN, facilityId: null },
  facilityIdFilter: null,
  assignedPatientIds: null,
  ownAppointmentsOnlyForUserId: null,
  ownDoctorBoostUserId: null,
  adminFacilityOverride: null,
};

const facilityScope: SearchScope = {
  ctx: { ...baseCtx, role: RBAC_ROLES.HF_USER },
  facilityIdFilter: "fac-1",
  assignedPatientIds: null,
  ownAppointmentsOnlyForUserId: null,
  ownDoctorBoostUserId: null,
  adminFacilityOverride: null,
};

const doctorScope: SearchScope = {
  ctx: { ...baseCtx, role: RBAC_ROLES.DOCTOR },
  facilityIdFilter: "fac-1",
  assignedPatientIds: null,
  ownAppointmentsOnlyForUserId: null,
  ownDoctorBoostUserId: "user-1",
  adminFacilityOverride: null,
};

const fchvScopeWithCaseload: SearchScope = {
  ctx: { ...baseCtx, role: RBAC_ROLES.FCHV_USER },
  facilityIdFilter: "fac-1",
  assignedPatientIds: ["patient-A", "patient-B"],
  ownAppointmentsOnlyForUserId: null,
  ownDoctorBoostUserId: null,
  adminFacilityOverride: null,
};

const fchvScopeEmpty: SearchScope = {
  ...fchvScopeWithCaseload,
  assignedPatientIds: [],
};

const userScope: SearchScope = {
  ctx: { ...baseCtx, role: RBAC_ROLES.USER },
  facilityIdFilter: "fac-1",
  assignedPatientIds: null,
  ownAppointmentsOnlyForUserId: "user-1",
  ownDoctorBoostUserId: null,
  adminFacilityOverride: null,
};

/** Mock the full Drizzle chain `.select().from().<...>.where().limit()` etc. */
function mockChain(rows: unknown[]) {
  // We don't care about intermediate calls - they all return `this`.
  const chain: any = {
    from: () => chain,
    innerJoin: () => chain,
    leftJoin: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => Promise.resolve(rows),
  };
  db.select.mockReturnValueOnce(chain);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ----------------------------------------------------------------------------
// PATIENTS RUNNER
// ----------------------------------------------------------------------------

describe("searchPatients (scope)", () => {
  const args = (scope: SearchScope) =>
    ({ scope, q: "shanti", classification: "name" as const, limit: 5 });

  it("admin: queries DB and returns hits", async () => {
    mockChain([
      {
        id: "p-1",
        patientId: "PAT-001",
        facilityId: "fac-9",
        given: "Shanti",
        middle: null,
        family: "Bhattarai",
        gender: "female",
        score: 0.8,
        matchedField: "given_name",
      },
    ]);
    const result = await searchPatients(args(adminScope));
    expect(db.select).toHaveBeenCalledTimes(1);
    expect(result.total).toBe(1);
    expect(result.results[0]).toMatchObject({
      type: "patient",
      id: "p-1",
      context: { patient_id: "p-1", facility_id: "fac-9" },
    });
    // No url leaked anywhere.
    expect(result.results[0]).not.toHaveProperty("url");
  });

  it("facility user: queries DB", async () => {
    mockChain([]);
    await searchPatients(args(facilityScope));
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("doctor: queries DB", async () => {
    mockChain([]);
    await searchPatients(args(doctorScope));
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("fchv with caseload: queries DB", async () => {
    mockChain([]);
    await searchPatients(args(fchvScopeWithCaseload));
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("fchv with empty caseload: short-circuits, no DB call", async () => {
    const result = await searchPatients(args(fchvScopeEmpty));
    expect(db.select).not.toHaveBeenCalled();
    expect(result).toEqual({ total: 0, results: [] });
  });

  it("user (self-only): returns no patients without hitting DB", async () => {
    const result = await searchPatients(args(userScope));
    expect(db.select).not.toHaveBeenCalled();
    expect(result).toEqual({ total: 0, results: [] });
  });

  it("dedupes multiple identifier-fanout rows into one hit per patient", async () => {
    mockChain([
      {
        id: "p-1",
        patientId: "PAT-001",
        facilityId: "fac-9",
        given: "A",
        middle: null,
        family: "X",
        gender: "male",
        score: 0.3,
        matchedField: "identifier",
      },
      {
        id: "p-1", // same patient
        patientId: "PAT-001",
        facilityId: "fac-9",
        given: "A",
        middle: null,
        family: "X",
        gender: "male",
        score: 0.9, // higher score wins
        matchedField: "given_name",
      },
    ]);
    const result = await searchPatients(args(adminScope));
    expect(result.total).toBe(1);
    expect(result.results[0]!.score).toBe(0.9);
    expect(result.results[0]!.matched_field).toBe("given_name");
  });
});

// ----------------------------------------------------------------------------
// APPOINTMENTS RUNNER
// ----------------------------------------------------------------------------

describe("searchAppointments (scope)", () => {
  const args = (scope: SearchScope) =>
    ({ scope, q: "shanti", classification: "name" as const, limit: 5 });

  it("admin: queries DB", async () => {
    mockChain([]);
    await searchAppointments(args(adminScope));
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("user (self-only): still queries DB (self-only is in WHERE, not a short-circuit)", async () => {
    mockChain([]);
    await searchAppointments(args(userScope));
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("fchv with empty caseload: short-circuits", async () => {
    const result = await searchAppointments(args(fchvScopeEmpty));
    expect(db.select).not.toHaveBeenCalled();
    expect(result).toEqual({ total: 0, results: [] });
  });

  it("returns hits with the right context payload", async () => {
    mockChain([
      {
        id: "appt-1",
        patientId: "p-1",
        doctorId: "doc-1",
        date: "2026-05-20",
        service: "general",
        status: "scheduled",
        patientGiven: "Shanti",
        patientFamily: "Bhattarai",
        doctorFirstName: "Bina",
        doctorLastName: "K.C.",
        score: 0.75,
        matchedField: "patient_given_name",
      },
    ]);
    const result = await searchAppointments(args(adminScope));
    expect(result.results[0]).toMatchObject({
      type: "appointment",
      id: "appt-1",
      context: {
        appointment_id: "appt-1",
        patient_id: "p-1",
        doctor_id: "doc-1",
      },
    });
    expect(Object.keys(result.results[0]!.context)).toEqual([
      "appointment_id",
      "patient_id",
      "doctor_id",
    ]);
  });
});

// ----------------------------------------------------------------------------
// PRACTITIONERS RUNNER
// ----------------------------------------------------------------------------

describe("searchPractitioners (scope)", () => {
  const args = (scope: SearchScope) =>
    ({ scope, q: "bina", classification: "name" as const, limit: 5 });

  it("admin: queries DB", async () => {
    mockChain([]);
    await searchPractitioners(args(adminScope));
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("facility user: queries DB", async () => {
    mockChain([]);
    await searchPractitioners(args(facilityScope));
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("user (self-only): no DB call, empty result", async () => {
    const result = await searchPractitioners(args(userScope));
    expect(db.select).not.toHaveBeenCalled();
    expect(result).toEqual({ total: 0, results: [] });
  });

  it("context omits optional fields when null", async () => {
    mockChain([
      {
        practitionerId: "pr-1",
        userId: null,
        firstName: "Bina",
        lastName: "K.C.",
        specialization: null,
        designation: null,
        facilityId: null,
        score: 0.6,
        matchedField: "first_name",
      },
    ]);
    const result = await searchPractitioners(args(adminScope));
    expect(result.results[0]!.context).toEqual({ practitioner_id: "pr-1" });
  });

  it("context includes user_id and facility_id when present", async () => {
    mockChain([
      {
        practitionerId: "pr-2",
        userId: "u-2",
        firstName: "Bina",
        lastName: "K.C.",
        specialization: null,
        designation: null,
        facilityId: "fac-1",
        score: 0.6,
        matchedField: "first_name",
      },
    ]);
    const result = await searchPractitioners(args(facilityScope));
    expect(result.results[0]!.context).toEqual({
      practitioner_id: "pr-2",
      user_id: "u-2",
      facility_id: "fac-1",
    });
  });
});

// ----------------------------------------------------------------------------
// VISITS RUNNER
// ----------------------------------------------------------------------------

describe("searchVisits (scope)", () => {
  const args = (scope: SearchScope) =>
    ({ scope, q: "shanti", classification: "name" as const, limit: 5 });

  it("admin: queries DB", async () => {
    mockChain([]);
    await searchVisits(args(adminScope));
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("user (self-only): short-circuits", async () => {
    const result = await searchVisits(args(userScope));
    expect(db.select).not.toHaveBeenCalled();
    expect(result).toEqual({ total: 0, results: [] });
  });

  it("fchv empty caseload: short-circuits", async () => {
    const result = await searchVisits(args(fchvScopeEmpty));
    expect(db.select).not.toHaveBeenCalled();
    expect(result).toEqual({ total: 0, results: [] });
  });

  it("emits the correct context shape", async () => {
    mockChain([
      {
        id: "v-1",
        patientId: "p-1",
        date: "2026-05-20",
        reason: "fever",
        service: null,
        status: "in_progress",
        patientGiven: "Shanti",
        patientFamily: "Bhattarai",
        score: 0.8,
        matchedField: "patient_given_name",
      },
    ]);
    const result = await searchVisits(args(adminScope));
    expect(result.results[0]!.context).toEqual({ visit_id: "v-1", patient_id: "p-1" });
  });
});

// ----------------------------------------------------------------------------
// ENCOUNTERS RUNNER
// ----------------------------------------------------------------------------

describe("searchEncounters (scope)", () => {
  const args = (scope: SearchScope) =>
    ({ scope, q: "shanti", classification: "name" as const, limit: 5 });

  it("admin: queries DB", async () => {
    mockChain([]);
    await searchEncounters(args(adminScope));
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("user (self-only): short-circuits", async () => {
    const result = await searchEncounters(args(userScope));
    expect(db.select).not.toHaveBeenCalled();
    expect(result).toEqual({ total: 0, results: [] });
  });

  it("emits the correct context shape (visit_id + patient_id + encounter_id)", async () => {
    mockChain([
      {
        id: "enc-1",
        visitId: "v-1",
        patientId: "p-1",
        encounterAt: new Date("2026-05-20T08:00:00Z"),
        encounterType: "outpatient",
        reason: "follow up",
        status: "finished",
        patientGiven: "Shanti",
        patientFamily: "Bhattarai",
        score: 0.85,
        matchedField: "patient_given_name",
      },
    ]);
    const result = await searchEncounters(args(adminScope));
    expect(result.results[0]!.context).toEqual({
      encounter_id: "enc-1",
      visit_id: "v-1",
      patient_id: "p-1",
    });
  });
});
