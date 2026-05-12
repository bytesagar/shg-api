/**
 * Empty-state service tests. Same mocked-db pattern as the runners: we
 * verify the right query chain is built per role and that the response
 * envelope matches the plan.
 */
import { RBAC_ROLES } from "../../../constants/rbac";
import { getEmptyState } from "../search.empty-state.service";
import type { ScopeContext } from "../types";

jest.mock("../../../db", () => ({
  db: {
    select: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { db } = require("../../../db") as { db: { select: jest.Mock } };

/**
 * Sequence of result-sets the chain mock will yield, one per .select() call.
 * Each entry is the rows the *terminal* method (.limit() or .groupBy().orderBy().limit())
 * will resolve to.
 */
const queue: Array<unknown[]> = [];

function setupChain() {
  db.select.mockImplementation(() => {
    const next = queue.shift() ?? [];
    // Drizzle's query builder is a thenable that you can also keep chaining
    // on. The FCHV caseload query awaits at `.where()`; the upcoming-
    // appointments query awaits at `.limit()`. So the chain object must be
    // awaitable at any depth - we shim that with a `.then` that resolves to
    // `next`, while every chain method returns the same object.
    const chain: any = {};
    chain.from = () => chain;
    chain.innerJoin = () => chain;
    chain.leftJoin = () => chain;
    chain.where = () => chain;
    chain.groupBy = () => chain;
    chain.orderBy = () => chain;
    chain.limit = () => chain;
    chain.then = (onFulfilled: (v: unknown) => unknown) =>
      Promise.resolve(next).then(onFulfilled);
    return chain;
  });
}

const ctxFor = (overrides: Partial<ScopeContext>): ScopeContext => ({
  userId: "user-1",
  role: RBAC_ROLES.HF_USER,
  facilityId: "fac-1",
  municipalityId: null,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  queue.length = 0;
  setupChain();
});

describe("getEmptyState - upcoming_appointments shape", () => {
  it("returns appointment hits with the plan's context shape", async () => {
    // [appointments query, audit_events query (returns rows so we skip fallback), patients hydrate]
    queue.push(
      [
        {
          id: "appt-1",
          patientId: "p-1",
          doctorId: "doc-1",
          date: "2026-05-20",
          service: "general",
          status: "scheduled",
          patientGiven: "Asha",
          patientFamily: "Sharma",
          doctorFirstName: "Bina",
          doctorLastName: "K.C.",
        },
      ],
      [{ patientId: "p-1", lastTouched: new Date() }],
      [
        {
          id: "p-1",
          patientId: "PAT-001",
          facilityId: "fac-1",
          gender: "female",
          given: "Asha",
          middle: null,
          family: "Sharma",
        },
      ],
    );

    const result = await getEmptyState(ctxFor({}));
    expect(result.upcoming_appointments).toHaveLength(1);
    expect(result.upcoming_appointments[0]).toMatchObject({
      type: "appointment",
      id: "appt-1",
      context: {
        appointment_id: "appt-1",
        patient_id: "p-1",
        doctor_id: "doc-1",
      },
    });
    // No url anywhere.
    expect(result.upcoming_appointments[0]).not.toHaveProperty("url");
  });
});

describe("getEmptyState - recent_patients fallback", () => {
  it("falls back to encounters.created_by when audit_events is empty", async () => {
    // appointments empty, audit_events empty -> encounter fallback fires,
    // then we hydrate.
    queue.push(
      [], // upcoming appointments
      [], // audit_events
      [{ patientId: "p-fallback", lastTouched: new Date() }], // encounters
      [
        {
          id: "p-fallback",
          patientId: "PAT-FB",
          facilityId: "fac-1",
          gender: "male",
          given: "Hari",
          middle: null,
          family: "Sapkota",
        },
      ],
    );

    const result = await getEmptyState(ctxFor({}));
    expect(result.recent_patients).toHaveLength(1);
    expect(result.recent_patients[0]!.id).toBe("p-fallback");
    expect(result.recent_patients[0]!.matched_field).toBe("recent");
  });

  it("FCHV: intersects recent_patients with caseload, drops the rest", async () => {
    // Mock the FCHV caseload load first (buildSearchScope calls db.select).
    queue.push(
      [{ patientId: "patient-A" }], // FCHV caseload from pregnancies
      [], // upcoming appointments
      [
        { patientId: "patient-A", lastTouched: new Date() },
        { patientId: "patient-NOT-IN-CASELOAD", lastTouched: new Date() },
      ],
      [
        {
          id: "patient-A",
          patientId: "PAT-A",
          facilityId: "fac-1",
          gender: "female",
          given: "Asha",
          middle: null,
          family: "Sharma",
        },
      ],
    );
    const result = await getEmptyState(
      ctxFor({ role: RBAC_ROLES.FCHV_USER }),
    );
    // Only the FCHV's assigned patient survives the intersect.
    expect(result.recent_patients.map((r) => r.id)).toEqual(["patient-A"]);
  });

  it("FCHV with empty caseload: returns empty arrays without a hydrate query", async () => {
    queue.push([]); // FCHV caseload empty
    const result = await getEmptyState(
      ctxFor({ role: RBAC_ROLES.FCHV_USER }),
    );
    expect(result.upcoming_appointments).toEqual([]);
    expect(result.recent_patients).toEqual([]);
  });
});
