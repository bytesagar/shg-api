/**
 * Unit tests for the HMIS 2082 derivation logic exposed via
 * MaternalHealthService.
 *
 * We don't spin up the database here — we exercise the gestational-age and
 * EDD math by mocking the repository so the service's compute path runs.
 */

import { MaternalHealthService } from "./maternal-health.service";
import { MaternalHealthRepository } from "./maternal-health.repository";
import { VisitRepository } from "../clinical-visits/visit.repository";
import { FacilityContext } from "../../context/facility-context";
import { db } from "../../db";

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock("./maternal-health.repository");
jest.mock("../clinical-visits/visit.repository");
jest.mock("../../db", () => ({
  db: {
    // Pass-through transaction so our mocked repo methods run as-is.
    transaction: jest.fn(async (cb: any) => cb({})),
  },
}));

const FACILITY_ID = "11111111-1111-1111-1111-111111111111";

const ctx: FacilityContext = {
  facilityId: FACILITY_ID,
  userId: "u-1",
  role: "doctor",
  userType: "doctor",
};

const VISIT = {
  id: "v-1",
  patientId: "p-1",
  service: "ANC",
  status: "in_progress" as const,
};

beforeEach(() => jest.clearAllMocks());

describe("MaternalHealthService.createPregnancy — EDD auto-compute", () => {
  it("computes EDD = LMP + 280 days when caller omits it", async () => {
    const repoInstance = {
      findActivePregnancyByPatientId: jest.fn().mockResolvedValue(null),
      createEncounter: jest.fn().mockResolvedValue({ id: "enc-1" }),
      createPregnancy: jest.fn().mockImplementation(async (_tx, data) => ({
        id: "preg-1",
        ...data,
      })),
      findPregnancyById: jest.fn(),
    };
    (MaternalHealthRepository as any).mockImplementation(() => repoInstance);
    (VisitRepository as any).mockImplementation(() => ({
      findById: jest.fn().mockResolvedValue(VISIT),
    }));

    const svc = new MaternalHealthService(ctx);
    const result = await svc.createPregnancy({
      visitId: "v-1",
      gravida: 2,
      lastMenstruationPeriod: "2025-11-01",
    } as any);

    expect(repoInstance.createPregnancy).toHaveBeenCalled();
    const args = repoInstance.createPregnancy.mock.calls[0][1];
    // LMP=2025-11-01 → EDD=2026-08-08 (LMP + 280 days).
    expect(args.expectedDeliveryDate).toBe("2026-08-08");
    expect((result as any).record.expectedDeliveryDate).toBe("2026-08-08");
  });

  it("preserves a caller-supplied EDD", async () => {
    const repoInstance = {
      findActivePregnancyByPatientId: jest.fn().mockResolvedValue(null),
      createEncounter: jest.fn().mockResolvedValue({ id: "enc-1" }),
      createPregnancy: jest.fn().mockImplementation(async (_tx, data) => ({
        id: "preg-1",
        ...data,
      })),
      findPregnancyById: jest.fn(),
    };
    (MaternalHealthRepository as any).mockImplementation(() => repoInstance);
    (VisitRepository as any).mockImplementation(() => ({
      findById: jest.fn().mockResolvedValue(VISIT),
    }));

    const svc = new MaternalHealthService(ctx);
    await svc.createPregnancy({
      visitId: "v-1",
      gravida: 1,
      lastMenstruationPeriod: "2025-11-01",
      expectedDeliveryDate: "2026-09-01",
    } as any);

    const args = repoInstance.createPregnancy.mock.calls[0][1];
    expect(args.expectedDeliveryDate).toBe("2026-09-01");
  });
});

describe("MaternalHealthService.createAntenatalCare — protocol derivation", () => {
  function setup(lmp: string | null) {
    const repoInstance = {
      findPregnancyById: jest.fn().mockResolvedValue({
        id: "preg-1",
        patientId: VISIT.patientId,
        lastMenstruationPeriod: lmp,
        status: "active",
        hmisCompliant: false,
        deliveries: [],
      }),
      createEncounter: jest.fn().mockResolvedValue({ id: "enc-1" }),
      createAntenatalCare: jest
        .fn()
        .mockImplementation(async (_tx, data) => ({ id: "anc-1", ...data })),
      countAntenatalCares: jest.fn().mockResolvedValue(1),
      setPregnancyComplianceFlag: jest.fn().mockResolvedValue(undefined),
    };
    (MaternalHealthRepository as any).mockImplementation(() => repoInstance);
    (VisitRepository as any).mockImplementation(() => ({
      findById: jest.fn().mockResolvedValue(VISIT),
    }));
    return repoInstance;
  }

  it("classifies an early visit as ANC1 when GA <= 12 weeks", async () => {
    const repo = setup("2026-04-01");
    const svc = new MaternalHealthService(ctx);
    await svc.createAntenatalCare({
      visitId: "v-1",
      pregnancyId: "preg-1",
      ancVisitDate: "2026-05-15", // 6 weeks after LMP
    } as any);
    const args = repo.createAntenatalCare.mock.calls[0][1];
    expect(args.protocolVisitNumber).toBe("ANC1");
    expect(args.protocolWindowViolation).toBe(false);
    expect(args.gestationalAgeWeeks).toBe(6);
  });

  it("classifies a 28-week visit as ANC4", async () => {
    const repo = setup("2025-11-01");
    const svc = new MaternalHealthService(ctx);
    await svc.createAntenatalCare({
      visitId: "v-1",
      pregnancyId: "preg-1",
      ancVisitDate: "2026-05-16", // 28 weeks after 2025-11-01
    } as any);
    const args = repo.createAntenatalCare.mock.calls[0][1];
    expect(args.protocolVisitNumber).toBe("ANC4");
    expect(args.gestationalAgeWeeks).toBe(28);
  });

  it("flags a window violation when client states a different bucket", async () => {
    const repo = setup("2026-04-01");
    const svc = new MaternalHealthService(ctx);
    await svc.createAntenatalCare({
      visitId: "v-1",
      pregnancyId: "preg-1",
      ancVisitDate: "2026-05-15", // GA=6w → canonical ANC1
      protocolVisitNumber: "ANC4",
    } as any);
    const args = repo.createAntenatalCare.mock.calls[0][1];
    expect(args.protocolVisitNumber).toBe("ANC1"); // server overrides
    expect(args.protocolWindowViolation).toBe(true);
  });

  it("falls back to the stated protocol when LMP is missing, and flags", async () => {
    const repo = setup(null);
    const svc = new MaternalHealthService(ctx);
    await svc.createAntenatalCare({
      visitId: "v-1",
      pregnancyId: "preg-1",
      ancVisitDate: "2026-05-15",
      protocolVisitNumber: "ANC3",
    } as any);
    const args = repo.createAntenatalCare.mock.calls[0][1];
    expect(args.protocolVisitNumber).toBe("ANC3");
    expect(args.protocolWindowViolation).toBe(true);
    expect(args.gestationalAgeWeeks).toBeNull();
  });

  it("snaps off-protocol weeks (e.g. 18w) to nearest later window (ANC2)", async () => {
    const repo = setup("2026-01-01");
    const svc = new MaternalHealthService(ctx);
    await svc.createAntenatalCare({
      visitId: "v-1",
      pregnancyId: "preg-1",
      ancVisitDate: "2026-05-07", // ~18 weeks
    } as any);
    const args = repo.createAntenatalCare.mock.calls[0][1];
    expect(args.protocolVisitNumber).toBe("ANC2");
    expect(args.gestationalAgeWeeks).toBe(18);
  });
});
