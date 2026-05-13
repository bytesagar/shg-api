import { FacilityContext } from "@/context/facility-context";
import { ImnciReportsService } from "./imnci-reports.service";
import { ImnciReportsRepository } from "./imnci-reports.repository";

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock("./imnci-reports.repository");

type Mocked = Record<string, jest.Mock<any, any>>;

function mockRepo(): Mocked {
  const repo: Mocked = {
    monthlyClassifications: jest.fn().mockResolvedValue([]),
    visitsSummary: jest.fn().mockResolvedValue([]),
    followUpsSummary: jest.fn().mockResolvedValue([]),
    commoditiesDispensed: jest.fn().mockResolvedValue([]),
  };
  (ImnciReportsRepository as unknown as jest.Mock).mockImplementation(() => repo);
  return repo;
}

beforeEach(() => jest.clearAllMocks());

const adminContext: FacilityContext = {
  facilityId: "fac-1",
  userId: "u-admin",
  role: "admin",
  userType: "admin",
};

const doctorContext: FacilityContext = {
  facilityId: "fac-1",
  userId: "u-doc",
  role: "doctor",
  userType: "doctor",
};

describe("ImnciReportsService scoping", () => {
  it("forces non-admin callers to their own facility even when no facilityId is requested", async () => {
    const repo = mockRepo();
    const svc = new ImnciReportsService(doctorContext);
    await svc.monthlyClassifications({});
    expect(repo.monthlyClassifications).toHaveBeenCalledWith(
      expect.objectContaining({ facilityId: "fac-1" }),
    );
  });

  it("rejects when a non-admin requests a different facility", async () => {
    mockRepo();
    const svc = new ImnciReportsService(doctorContext);
    await expect(
      svc.monthlyClassifications({ facilityId: "fac-other" }),
    ).rejects.toThrow(/another facility/i);
  });

  it("lets non-admin pass their own facilityId explicitly", async () => {
    const repo = mockRepo();
    const svc = new ImnciReportsService(doctorContext);
    await svc.visitsSummary({ facilityId: "fac-1" });
    expect(repo.visitsSummary).toHaveBeenCalledWith(
      expect.objectContaining({ facilityId: "fac-1" }),
    );
  });

  it("admin without facilityId queries across all facilities", async () => {
    const repo = mockRepo();
    const svc = new ImnciReportsService(adminContext);
    await svc.visitsSummary({});
    const arg = repo.visitsSummary.mock.calls[0][0];
    expect(arg.facilityId).toBeUndefined();
  });

  it("admin with facilityId filters to that facility", async () => {
    const repo = mockRepo();
    const svc = new ImnciReportsService(adminContext);
    await svc.followUpsSummary({ facilityId: "fac-other" });
    expect(repo.followUpsSummary).toHaveBeenCalledWith(
      expect.objectContaining({ facilityId: "fac-other" }),
    );
  });

  it("propagates from/to date range through to the repo", async () => {
    const repo = mockRepo();
    const svc = new ImnciReportsService(doctorContext);
    await svc.commoditiesDispensed({ from: "2026-01-01", to: "2026-03-31" });
    expect(repo.commoditiesDispensed).toHaveBeenCalledWith(
      expect.objectContaining({ from: "2026-01-01", to: "2026-03-31" }),
    );
  });
});
