/**
 * Unit tests for the HMIS 2082 batch dose flow exposed by ImmunizationService.
 *
 * The repository and DB are mocked so the validation and dedupe logic runs
 * end-to-end without a Postgres dependency.
 */

import { FacilityContext } from "../../context/facility-context";
import { ImmunizationService } from "./immunization.service";
import { ImmunizationRepository } from "./immunization.repository";
import { PatientRepository } from "../patients/patient.repository";
import { db } from "../../db";

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock("./immunization.repository");
jest.mock("../patients/patient.repository");

// Stub the tx callbacks for find-or-create visit + create encounter. The
// chained Drizzle query builder is faked with thenable wrappers so the
// service's `tx.select().from().where()...` and `tx.insert().values()...`
// calls resolve to predictable rows without hitting Postgres.
function makeTxStub() {
  const visit = {
    id: "visit-1",
    patientId: "patient-1",
    service: "immunization",
  };
  const encounter = { id: "encounter-1" };
  const selectChain = {
    from: () => selectChain,
    where: () => selectChain,
    orderBy: () => selectChain,
    limit: () => Promise.resolve([visit]), // pretend an active visit exists
  };
  const insertChain = (row: unknown) => ({
    values: () => ({ returning: () => Promise.resolve([row]) }),
  });
  return {
    select: () => selectChain,
    insert: (table: { _: { name?: string } }) => {
      // Drizzle exposes table internals on `_`; we don't need them — just
      // route to the matching stub by checking which table was passed.
      if (
        table &&
        typeof table === "object" &&
        Object.values(table as Record<string, unknown>).some(
          (v) => typeof v === "string" && v === "encounters",
        )
      ) {
        return insertChain(encounter);
      }
      // Default to encounter for any insert — the service only inserts visits
      // when the existing-visit lookup returns empty, which we avoid above.
      return insertChain(encounter);
    },
  };
}
jest.mock("../../db", () => ({
  db: {
    transaction: jest.fn(async (cb: any) => cb(makeTxStub())),
  },
}));

const FACILITY_ID = "11111111-1111-1111-1111-111111111111";

const ctx: FacilityContext = {
  facilityId: FACILITY_ID,
  userId: "u-1",
  role: "doctor",
  userType: "doctor",
};

const PATIENT = { id: "patient-1" };
const PROFILE = { id: "profile-1" };

const PENTA = { code: "PENTA", totalDoses: 3 };
const BCG = { code: "BCG", totalDoses: 1 };
const OPV = { code: "OPV", totalDoses: 3 };

function repoMock(overrides: Partial<Record<string, jest.Mock>> = {}) {
  const repo = {
    findChildImmunizationByPatient: jest.fn().mockResolvedValue(PROFILE),
    findVaccine: jest.fn().mockImplementation((code: string) => {
      if (code === "PENTA") return Promise.resolve(PENTA);
      if (code === "BCG") return Promise.resolve(BCG);
      if (code === "OPV") return Promise.resolve(OPV);
      return Promise.resolve(null);
    }),
    findCatalogDose: jest.fn().mockResolvedValue(null),
    listExistingDoseKeys: jest.fn().mockResolvedValue([]),
    createImmunizationHistoryBatch: jest
      .fn()
      .mockImplementation((_tx, params: any) =>
        Promise.resolve(
          params.doses.map((d: any, i: number) => ({
            id: `dose-${i}`,
            ...d,
          })),
        ),
      ),
    ...overrides,
  };
  (ImmunizationRepository as unknown as jest.Mock).mockImplementation(
    () => repo,
  );
  return repo;
}

function patientRepoMock(patient = PATIENT) {
  const pr = { findById: jest.fn().mockResolvedValue(patient) };
  (PatientRepository as unknown as jest.Mock).mockImplementation(() => pr);
  return pr;
}

beforeEach(() => {
  jest.clearAllMocks();
  (db.transaction as jest.Mock).mockImplementation(async (cb: any) =>
    cb(makeTxStub()),
  );
});

describe("ImmunizationService.normaliseDosesPayload", () => {
  it("returns the doses array when the body wraps it", () => {
    const svc = new ImmunizationService(ctx);
    const result = svc.normaliseDosesPayload({
      doses: [
        { vaccineCode: "BCG", doseNumber: 1 },
        { vaccineCode: "OPV", doseNumber: 1 },
      ],
    } as any);
    expect(result).toHaveLength(2);
  });

  it("wraps a single flat dose into a one-element array (back-compat)", () => {
    const svc = new ImmunizationService(ctx);
    const result = svc.normaliseDosesPayload({
      vaccineCode: "BCG",
      doseNumber: 1,
    } as any);
    expect(result).toEqual([{ vaccineCode: "BCG", doseNumber: 1 }]);
  });

  it("wraps a legacy free-text dose into a one-element array", () => {
    const svc = new ImmunizationService(ctx);
    const result = svc.normaliseDosesPayload({
      vaccineName: "BCG",
      date: "2026-05-20",
      vaccinated: true,
    } as any);
    expect(result).toHaveLength(1);
    expect(result[0].vaccineName).toBe("BCG");
  });
});

describe("ImmunizationService.recordDoses", () => {
  it("happy path — records 4 distinct doses in a single transaction", async () => {
    const repo = repoMock();
    patientRepoMock();
    const svc = new ImmunizationService(ctx);

    const result = await svc.recordDoses("patient-1", [
      { vaccineCode: "PENTA", doseNumber: 2 },
      { vaccineCode: "OPV", doseNumber: 2 },
      { vaccineCode: "BCG", doseNumber: 1 },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items).toHaveLength(3);
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(repo.createImmunizationHistoryBatch).toHaveBeenCalledTimes(1);
  });

  it("returns PATIENT_NOT_FOUND when the patient lookup fails", async () => {
    repoMock();
    const pr = patientRepoMock();
    pr.findById.mockResolvedValueOnce(null);
    const svc = new ImmunizationService(ctx);
    const result = await svc.recordDoses("missing", [
      { vaccineCode: "BCG", doseNumber: 1 },
    ]);
    expect(result).toEqual({ ok: false, error: { kind: "PATIENT_NOT_FOUND" } });
  });

  it("returns PROFILE_REQUIRED when the child immunization profile is missing", async () => {
    const repo = repoMock();
    repo.findChildImmunizationByPatient.mockResolvedValueOnce(null);
    patientRepoMock();
    const svc = new ImmunizationService(ctx);
    const result = await svc.recordDoses("patient-1", [
      { vaccineCode: "BCG", doseNumber: 1 },
    ]);
    expect(result).toEqual({
      ok: false,
      error: { kind: "PROFILE_REQUIRED" },
    });
  });

  it("rejects unknown vaccine codes with conflictingIndex", async () => {
    repoMock();
    patientRepoMock();
    const svc = new ImmunizationService(ctx);
    const result = await svc.recordDoses("patient-1", [
      { vaccineCode: "BCG", doseNumber: 1 },
      { vaccineCode: "NONSENSE", doseNumber: 1 },
      { vaccineCode: "PENTA", doseNumber: 1 },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("UNKNOWN_VACCINE");
    if (result.error.kind !== "UNKNOWN_VACCINE") return;
    expect(result.error.conflictingIndex).toBe(1);
    expect(result.error.vaccineCode).toBe("NONSENSE");
  });

  it("rejects dose_number > total_doses", async () => {
    repoMock();
    patientRepoMock();
    const svc = new ImmunizationService(ctx);
    const result = await svc.recordDoses("patient-1", [
      { vaccineCode: "PENTA", doseNumber: 4 }, // PENTA has 3 doses
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("DOSE_NUMBER_OUT_OF_RANGE");
    if (result.error.kind !== "DOSE_NUMBER_OUT_OF_RANGE") return;
    expect(result.error.totalDoses).toBe(3);
    expect(result.error.conflictingIndex).toBe(0);
  });

  it("rejects duplicates within the same batch", async () => {
    repoMock();
    patientRepoMock();
    const svc = new ImmunizationService(ctx);
    const result = await svc.recordDoses("patient-1", [
      { vaccineCode: "PENTA", doseNumber: 2 },
      { vaccineCode: "OPV", doseNumber: 2 },
      { vaccineCode: "PENTA", doseNumber: 2 }, // duplicate
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("DUPLICATE_IN_BATCH");
    if (result.error.kind !== "DUPLICATE_IN_BATCH") return;
    expect(result.error.conflictingIndex).toBe(2);
  });

  it("rejects a dose already in the DB", async () => {
    const repo = repoMock();
    repo.listExistingDoseKeys.mockResolvedValueOnce([
      { vaccineCode: "BCG", doseNumber: 1 },
    ]);
    patientRepoMock();
    const svc = new ImmunizationService(ctx);
    const result = await svc.recordDoses("patient-1", [
      { vaccineCode: "PENTA", doseNumber: 1 },
      { vaccineCode: "BCG", doseNumber: 1 }, // already exists
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("DUPLICATE_EXISTS");
    if (result.error.kind !== "DUPLICATE_EXISTS") return;
    expect(result.error.conflictingIndex).toBe(1);
  });

  it("computes nextDoseDueDate when the catalog defines a next dose window", async () => {
    const repo = repoMock();
    // PENTA-2 next dose is PENTA-3 at week 14 (98 days). PENTA-2 itself is at
    // week 10 (70 days). Gap = 28 days; recording at 2026-05-20 → due 2026-06-17.
    repo.findCatalogDose
      .mockResolvedValueOnce({
        vaccineCode: "PENTA",
        doseNumber: 3,
        targetAgeMinDays: 98,
      })
      .mockResolvedValueOnce({
        vaccineCode: "PENTA",
        doseNumber: 2,
        targetAgeMinDays: 70,
      });
    patientRepoMock();
    const svc = new ImmunizationService(ctx);
    const result = await svc.recordDoses("patient-1", [
      {
        vaccineCode: "PENTA",
        doseNumber: 2,
        administeredAt: "2026-05-20T08:00:00.000Z",
      },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const inserted = repo.createImmunizationHistoryBatch.mock.calls[0][1];
    expect(inserted.doses[0].nextDoseDueDate).toBe("2026-06-17");
  });
});
