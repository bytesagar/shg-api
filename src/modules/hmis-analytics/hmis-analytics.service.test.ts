import { FacilityContext } from "../../context/facility-context";
import { HmisAnalyticsService } from "./hmis-analytics.service";
import { HmisAnalyticsRepository } from "./hmis-analytics.repository";
import {
  HMIS_INDICATORS,
  isHmisIndicator,
} from "./hmis-analytics.types";

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock("./hmis-analytics.repository");

const FACILITY_ID = "11111111-1111-1111-1111-111111111111";

function mockRepo() {
  const repo = {
    ancNCoverage: jest
      .fn()
      .mockResolvedValue({ numerator: 5, denominator: 10, value: 0.5 }),
    ifa180Coverage: jest
      .fn()
      .mockResolvedValue({ numerator: 3, denominator: 8, value: 0.375 }),
    tt2plusCoverage: jest
      .fn()
      .mockResolvedValue({ numerator: 4, denominator: 8, value: 0.5 }),
    institutionalDeliveryRate: jest
      .fn()
      .mockResolvedValue({ numerator: 7, denominator: 8, value: 0.875 }),
    sbaAttendedRate: jest
      .fn()
      .mockResolvedValue({ numerator: 6, denominator: 8, value: 0.75 }),
    csectionRate: jest
      .fn()
      .mockResolvedValue({ numerator: 2, denominator: 8, value: 0.25 }),
    stillbirthRatePer1000: jest
      .fn()
      .mockResolvedValue({ numerator: 1, denominator: 8, value: 125.0 }),
    lowBirthWeightRate: jest
      .fn()
      .mockResolvedValue({ numerator: 2, denominator: 10, value: 0.2 }),
    pncCoverage: jest
      .fn()
      .mockResolvedValue({ numerator: 5, denominator: 8, value: 0.625 }),
    maternalMortalityRatioPer100k: jest
      .fn()
      .mockResolvedValue({ numerator: 0, denominator: 8, value: 0 }),
    complicationManagementRate: jest
      .fn()
      .mockResolvedValue({ numerator: 9, denominator: 10, value: 0.9 }),
    ancNCoverageByEthnicity: jest
      .fn()
      .mockResolvedValue([
        { key: "01_dalit", numerator: 2, denominator: 4, value: 0.5 },
      ]),
    getAamaMonthlyAggregate: jest.fn().mockResolvedValue([]),
    recomputeAamaMonthlyAggregate: jest.fn().mockResolvedValue(undefined),
  };
  (HmisAnalyticsRepository as unknown as jest.Mock).mockImplementation(
    () => repo,
  );
  return repo;
}

const context: FacilityContext = {
  facilityId: FACILITY_ID,
  userId: "u-1",
  role: "admin",
  userType: "admin",
};

const QUERY = {
  from: new Date("2025-05-01T00:00:00.000Z"),
  to: new Date("2026-04-30T00:00:00.000Z"),
};

beforeEach(() => jest.clearAllMocks());

describe("isHmisIndicator", () => {
  it("accepts known indicators", () => {
    for (const i of HMIS_INDICATORS) {
      expect(isHmisIndicator(i)).toBe(true);
    }
  });
  it("rejects unknown", () => {
    expect(isHmisIndicator("not_an_indicator")).toBe(false);
    expect(isHmisIndicator(123)).toBe(false);
  });
});

describe("HmisAnalyticsService.getIndicator", () => {
  it("routes anc4_coverage to ancNCoverage([1,2,3,4])", async () => {
    const repo = mockRepo();
    const svc = new HmisAnalyticsService(context);
    const result = await svc.getIndicator("anc4_coverage", QUERY as any);
    expect(repo.ancNCoverage).toHaveBeenCalledWith(
      expect.objectContaining({ facilityId: FACILITY_ID }),
      [1, 2, 3, 4],
    );
    expect(result.value).toBe(0.5);
  });

  it("routes anc1_coverage to ancNCoverage([1])", async () => {
    const repo = mockRepo();
    const svc = new HmisAnalyticsService(context);
    await svc.getIndicator("anc1_coverage", QUERY as any);
    expect(repo.ancNCoverage).toHaveBeenCalledWith(expect.any(Object), [1]);
  });

  it("routes anc8_completion to ancNCoverage([1..8])", async () => {
    const repo = mockRepo();
    const svc = new HmisAnalyticsService(context);
    await svc.getIndicator("anc8_completion", QUERY as any);
    expect(repo.ancNCoverage).toHaveBeenCalledWith(
      expect.any(Object),
      [1, 2, 3, 4, 5, 6, 7, 8],
    );
  });

  it("routes institutional_delivery_rate to repo", async () => {
    const repo = mockRepo();
    const svc = new HmisAnalyticsService(context);
    await svc.getIndicator("institutional_delivery_rate", QUERY as any);
    expect(repo.institutionalDeliveryRate).toHaveBeenCalled();
  });

  it("routes pnc4_coverage to pncCoverage with PNC4 code", async () => {
    const repo = mockRepo();
    const svc = new HmisAnalyticsService(context);
    await svc.getIndicator("pnc4_coverage", QUERY as any);
    expect(repo.pncCoverage).toHaveBeenCalledWith(
      expect.any(Object),
      "PNC4",
    );
  });

  it("attaches byEthnicity when groupBy=ethnicity for ANC indicators", async () => {
    const repo = mockRepo();
    const svc = new HmisAnalyticsService(context);
    const result = await svc.getIndicator("anc4_coverage", {
      ...QUERY,
      groupBy: "ethnicity",
    } as any);
    expect(repo.ancNCoverageByEthnicity).toHaveBeenCalled();
    expect(result.byEthnicity).toEqual([
      { key: "01_dalit", numerator: 2, denominator: 4, value: 0.5 },
    ]);
  });

  it("passes the facility filter scope through to the repo", async () => {
    const repo = mockRepo();
    const svc = new HmisAnalyticsService(context);
    await svc.getIndicator("csection_rate", QUERY as any);
    expect(repo.csectionRate).toHaveBeenCalledWith(
      expect.objectContaining({ facilityId: FACILITY_ID }),
    );
  });

  it("snaps inclusive `to` to next-day midnight", async () => {
    const repo = mockRepo();
    const svc = new HmisAnalyticsService(context);
    await svc.getIndicator("sba_attended_rate", QUERY as any);
    const args = repo.sbaAttendedRate.mock.calls[0][0];
    // Original `to` was 2026-04-30 00:00:00Z → toExclusive should be 2026-05-01 00:00:00Z.
    expect((args.toExclusive as Date).toISOString().slice(0, 10)).toBe(
      "2026-05-01",
    );
  });
});

describe("HmisAnalyticsService.getMonthlyAggregate", () => {
  it("delegates to repo with facility id from context", async () => {
    const repo = mockRepo();
    const svc = new HmisAnalyticsService(context);
    await svc.getMonthlyAggregate(2082, 4);
    expect(repo.getAamaMonthlyAggregate).toHaveBeenCalledWith({
      facilityId: FACILITY_ID,
      year: 2082,
      month: 4,
    });
  });
});

describe("HmisAnalyticsService.recomputeMonthlyAggregate", () => {
  it("delegates to repo and returns ok", async () => {
    const repo = mockRepo();
    const svc = new HmisAnalyticsService(context);
    const result = await svc.recomputeMonthlyAggregate(2082, 4);
    expect(repo.recomputeAamaMonthlyAggregate).toHaveBeenCalledWith({
      facilityId: FACILITY_ID,
      year: 2082,
      month: 4,
    });
    expect(result).toEqual({ ok: true });
  });
});
