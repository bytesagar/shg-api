import { FacilityContext } from "../context/facility-context";
import { AppError } from "../utils/app-error";

jest.mock("../db", () => ({ db: { select: jest.fn() } }));
jest.mock("../utils/logger", () => ({ logger: { audit: jest.fn() } }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { db } = require("../db") as { db: { select: jest.Mock } };

import { patientScopeFromQuery } from "./patient-scope.middleware";

/**
 * Queue one `db.select(...).from(...).where(...).limit(1)` result. The
 * middleware issues these in order:
 *   1. resolvePatientFacilityId   (patients)      — always when a patientId is present
 *   2. hasDoctorPatientRelationship (appointments) — only for a cross-facility doctor
 */
function mockSelectOnce(rows: Array<Record<string, unknown>>) {
  db.select.mockImplementationOnce(() => ({
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve(rows),
      }),
    }),
  }));
}

function makeReq(
  context: FacilityContext | undefined,
  query: Record<string, string> = {},
) {
  // Only the fields the middleware reads.
  return { context, query, params: {} } as never;
}

const res = {} as never;

const facilityUser: FacilityContext = {
  facilityId: "fac-1",
  userId: "user-1",
  role: "hfuser",
  userType: "facility",
};

const doctor: FacilityContext = {
  facilityId: "fac-1",
  userId: "doc-1",
  role: "doctor",
  userType: "doctor",
};

describe("patientScope middleware — care-relationship cross-facility access", () => {
  beforeEach(() => jest.clearAllMocks());

  it("grants a doctor access to a different-facility patient they have an appointment with", async () => {
    mockSelectOnce([{ facilityId: "fac-2" }]); // patient lives in fac-2
    mockSelectOnce([{ id: "appt-1" }]); // doctor↔patient appointment exists

    const req = makeReq({ ...doctor }, { patientId: "p-1" });
    const next = jest.fn();

    await patientScopeFromQuery()(req, res, next);

    // Context is widened to the patient's facility so downstream
    // withFacilityScope reads succeed for that one patient.
    expect((req as { context: FacilityContext }).context.facilityId).toBe(
      "fac-2",
    );
    expect(next).toHaveBeenCalledWith();
    expect(db.select).toHaveBeenCalledTimes(2);
  });

  it("denies a doctor access to a different-facility patient with NO appointment", async () => {
    mockSelectOnce([{ facilityId: "fac-2" }]); // patient in fac-2
    mockSelectOnce([]); // no appointment linking them

    const req = makeReq({ ...doctor }, { patientId: "p-1" });
    const next = jest.fn();

    await patientScopeFromQuery()(req, res, next);

    // No relationship → scope NOT widened; the controller's facility scope
    // will 404 as usual.
    expect((req as { context: FacilityContext }).context.facilityId).toBe(
      "fac-1",
    );
    expect(next).toHaveBeenCalledWith();
    expect(db.select).toHaveBeenCalledTimes(2);
  });

  it("denies a NON-doctor access to a different-facility patient (even with an appointment)", async () => {
    mockSelectOnce([{ facilityId: "fac-2" }]); // patient in fac-2

    const req = makeReq({ ...facilityUser }, { patientId: "p-1" });
    const next = jest.fn();

    await patientScopeFromQuery()(req, res, next);

    // Non-doctor → never widened, and the relationship is never even checked.
    expect((req as { context: FacilityContext }).context.facilityId).toBe(
      "fac-1",
    );
    expect(next).toHaveBeenCalledWith();
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("leaves scope untouched for a same-facility patient (no relationship lookup)", async () => {
    mockSelectOnce([{ facilityId: "fac-1" }]); // same facility as caller

    const req = makeReq({ ...doctor }, { patientId: "p-1" });
    const next = jest.fn();

    await patientScopeFromQuery()(req, res, next);

    expect((req as { context: FacilityContext }).context.facilityId).toBe(
      "fac-1",
    );
    expect(next).toHaveBeenCalledWith();
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the patient does not exist (lets the controller 404)", async () => {
    mockSelectOnce([]); // unknown patient

    const req = makeReq({ ...doctor }, { patientId: "ghost" });
    const next = jest.fn();

    await patientScopeFromQuery()(req, res, next);

    expect((req as { context: FacilityContext }).context.facilityId).toBe(
      "fac-1",
    );
    expect(next).toHaveBeenCalledWith();
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("passes through untouched when no patientId is present (no DB calls)", async () => {
    const req = makeReq({ ...doctor }, {});
    const next = jest.fn();

    await patientScopeFromQuery()(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(db.select).not.toHaveBeenCalled();
  });

  it("rejects when there is no auth context", async () => {
    const req = makeReq(undefined, { patientId: "p-1" });
    const next = jest.fn();

    await patientScopeFromQuery()(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(db.select).not.toHaveBeenCalled();
  });
});
