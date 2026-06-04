import { FacilityContext } from "../../context/facility-context";
import { AnalyticsService } from "./analytics.service";
import { AnalyticsRepository } from "./analytics.repository";
import { isAnalyticsMethod } from "./analytics.methods";

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock("./analytics.repository");

type Mocked = Record<string, jest.Mock<any, any>>;

const FACILITY_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_FACILITY_ID = "22222222-2222-2222-2222-222222222222";
const PROVINCE_ID = "33333333-3333-3333-3333-333333333333";
const GEO_FACILITY_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const GEO_FACILITY_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function mockRepo(): Mocked {
  const repo: Mocked = {
    totalPatients: jest.fn().mockResolvedValue({ total: 0 }),
    totalOpd: jest.fn().mockResolvedValue({ total: 0 }),
    totalImmunization: jest.fn().mockResolvedValue({ total: 0 }),
    totalMaternal: jest.fn().mockResolvedValue({ total: 0 }),
    serviceWiseReferrals: jest.fn().mockResolvedValue([]),
    sectorWiseReferrals: jest.fn().mockResolvedValue([]),
    telehealthRequests: jest
      .fn()
      .mockResolvedValue({ requested: 0, performed: 0 }),
    opdFollowUp: jest
      .fn()
      .mockResolvedValue({ requested: 0, performed: 0 }),
    morbidityTrend: jest.fn().mockResolvedValue({ series: [] }),
    demographicsByGender: jest
      .fn()
      .mockResolvedValue({ male: 0, female: 0, other: 0 }),
    patientsByEthnicity: jest.fn().mockResolvedValue([]),
    patientsByMunicipality: jest.fn().mockResolvedValue([]),
    patientsByFacility: jest.fn().mockResolvedValue([]),
    topDiseases: jest.fn().mockResolvedValue([]),
    ageGenderDistribution: jest.fn().mockResolvedValue([]),
    visitsDailyTrend: jest.fn().mockResolvedValue([]),
    facilityLeaderboard: jest.fn().mockResolvedValue([]),
    systemTotals: jest.fn().mockResolvedValue({
      totalFacilities: 0,
      totalPatients: 0,
      totalOpd: 0,
      totalImmunization: 0,
      totalMaternal: 0,
    }),
    facilityIdsByGeography: jest
      .fn()
      .mockResolvedValue([GEO_FACILITY_A, GEO_FACILITY_B]),
  };
  (AnalyticsRepository as unknown as jest.Mock).mockImplementation(() => repo);
  return repo;
}

const adminContext: FacilityContext = {
  facilityId: FACILITY_ID,
  userId: "u-admin",
  role: "admin",
  userType: "admin",
};

const doctorContext: FacilityContext = {
  facilityId: FACILITY_ID,
  userId: "u-doc",
  role: "doctor",
  userType: "doctor",
};

const RANGE = {
  fromDate: "2025-05-18",
  toDate: "2026-05-18",
};

beforeEach(() => jest.clearAllMocks());

describe("isAnalyticsMethod", () => {
  it("accepts known methods", () => {
    expect(isAnalyticsMethod("TOTAL_PATIENTS")).toBe(true);
    expect(isAnalyticsMethod("CHART_DATA_FOR_MALE_AND_FEMALE_BY_AGE_RANGE")).toBe(
      true,
    );
  });

  it("rejects unknown values", () => {
    expect(isAnalyticsMethod("BOGUS")).toBe(false);
    expect(isAnalyticsMethod(42)).toBe(false);
    expect(isAnalyticsMethod(undefined)).toBe(false);
  });
});

describe("AnalyticsService.resolveScope", () => {
  it("returns facility scope with caller's facility when no params given", async () => {
    mockRepo();
    const svc = new AnalyticsService(doctorContext);
    await expect(svc.resolveScope({})).resolves.toEqual({
      kind: "facility",
      facilityId: FACILITY_ID,
    });
  });

  it("returns facility scope when caller passes their own facility id", async () => {
    mockRepo();
    const svc = new AnalyticsService(doctorContext);
    await expect(svc.resolveScope({ facilityId: FACILITY_ID })).resolves.toEqual(
      {
        kind: "facility",
        facilityId: FACILITY_ID,
      },
    );
  });

  it("rejects a non-admin asking for another facility", async () => {
    mockRepo();
    const svc = new AnalyticsService(doctorContext);
    await expect(
      svc.resolveScope({ facilityId: OTHER_FACILITY_ID }),
    ).rejects.toThrow(/another facility/i);
  });

  it("rejects a non-admin asking for facilityId=all", async () => {
    mockRepo();
    const svc = new AnalyticsService(doctorContext);
    await expect(svc.resolveScope({ facilityId: "all" })).rejects.toThrow(
      /admin-only/i,
    );
  });

  it("lets admin pick any facility", async () => {
    mockRepo();
    const svc = new AnalyticsService(adminContext);
    await expect(
      svc.resolveScope({ facilityId: OTHER_FACILITY_ID }),
    ).resolves.toEqual({
      kind: "facility",
      facilityId: OTHER_FACILITY_ID,
    });
  });

  it("lets admin request the all-facilities scope", async () => {
    mockRepo();
    const svc = new AnalyticsService(adminContext);
    await expect(svc.resolveScope({ facilityId: "all" })).resolves.toEqual({
      kind: "all",
    });
  });

  it("resolves a geography filter to the set of matching facility ids (admin)", async () => {
    const repo = mockRepo();
    const svc = new AnalyticsService(adminContext);
    await expect(
      svc.resolveScope({ provinceId: PROVINCE_ID }),
    ).resolves.toEqual({
      kind: "facilities",
      facilityIds: [GEO_FACILITY_A, GEO_FACILITY_B],
    });
    expect(repo.facilityIdsByGeography).toHaveBeenCalledWith(
      expect.objectContaining({ provinceId: PROVINCE_ID }),
    );
  });

  it("rejects a non-admin using geography filters", async () => {
    mockRepo();
    const svc = new AnalyticsService(doctorContext);
    await expect(
      svc.resolveScope({ provinceId: PROVINCE_ID }),
    ).rejects.toThrow(/admin-only/i);
  });
});

describe("AnalyticsService.run — validation", () => {
  it("rejects missing fromDate / toDate", async () => {
    mockRepo();
    const svc = new AnalyticsService(doctorContext);
    const scope = await svc.resolveScope({});
    await expect(svc.run("TOTAL_PATIENTS", scope, {})).rejects.toThrow(
      /Validation failed/,
    );
  });

  it("rejects when fromDate > toDate", async () => {
    mockRepo();
    const svc = new AnalyticsService(doctorContext);
    const scope = await svc.resolveScope({});
    await expect(
      svc.run("TOTAL_PATIENTS", scope, {
        fromDate: RANGE.toDate,
        toDate: RANGE.fromDate,
      }),
    ).rejects.toThrow(/fromDate must be <= toDate/);
  });

  it("rejects malformed date strings", async () => {
    mockRepo();
    const svc = new AnalyticsService(doctorContext);
    const scope = await svc.resolveScope({});
    await expect(
      svc.run("TOTAL_PATIENTS", scope, {
        fromDate: "not-a-date",
        toDate: RANGE.toDate,
      }),
    ).rejects.toThrow(/Validation failed/);
  });

  it("rejects epoch-millisecond inputs (now legacy)", async () => {
    mockRepo();
    const svc = new AnalyticsService(doctorContext);
    const scope = await svc.resolveScope({});
    await expect(
      svc.run("TOTAL_PATIENTS", scope, {
        fromDate: "1747526400000",
        toDate: "1779062400000",
      }),
    ).rejects.toThrow(/YYYY-MM-DD/);
  });
});

describe("AnalyticsService.run — admin/scope gating", () => {
  it("rejects admin-only methods for non-admins", async () => {
    mockRepo();
    const svc = new AnalyticsService(doctorContext);
    const scope = await svc.resolveScope({});
    await expect(
      svc.run("FACILITY_LEADERBOARD", scope, RANGE),
    ).rejects.toThrow(/admin-only/i);
  });

  it("rejects scope-all-required methods when scope is facility", async () => {
    mockRepo();
    const svc = new AnalyticsService(adminContext);
    const scope = await svc.resolveScope({}); // facility scope on admin's own facility
    await expect(
      svc.run("FACILITY_LEADERBOARD", scope, RANGE),
    ).rejects.toThrow(/requires facilityId=all/i);
  });

  it("admin + facilityId=all + admin-only method succeeds", async () => {
    const repo = mockRepo();
    const svc = new AnalyticsService(adminContext);
    const scope = await svc.resolveScope({ facilityId: "all" });
    const out = await svc.run("FACILITY_LEADERBOARD", scope, RANGE);
    expect(repo.facilityLeaderboard).toHaveBeenCalledTimes(1);
    expect(out.scope).toEqual({ kind: "all" });
  });

  it("SYSTEM_TOTALS requires admin + scope=all", async () => {
    const repo = mockRepo();
    const svc = new AnalyticsService(adminContext);
    const scope = await svc.resolveScope({ facilityId: "all" });
    await svc.run("SYSTEM_TOTALS", scope, RANGE);
    expect(repo.systemTotals).toHaveBeenCalledTimes(1);
  });
});

describe("AnalyticsService.run — repo dispatch", () => {
  it("passes the resolved facility id into the repository filter", async () => {
    const repo = mockRepo();
    const svc = new AnalyticsService(doctorContext);
    const scope = await svc.resolveScope({});
    await svc.run("TOTAL_PATIENTS", scope, RANGE);
    expect(repo.totalPatients).toHaveBeenCalledWith(
      expect.objectContaining({ facilityIds: [FACILITY_ID] }),
    );
  });

  it("omits facilityIds from the repo filter when scope=all", async () => {
    const repo = mockRepo();
    const svc = new AnalyticsService(adminContext);
    const scope = await svc.resolveScope({ facilityId: "all" });
    await svc.run("TOTAL_PATIENTS", scope, RANGE);
    const arg = repo.totalPatients.mock.calls[0][0];
    expect(arg.facilityIds).toBeUndefined();
  });

  it("forwards the resolved geography set as facilityIds", async () => {
    const repo = mockRepo();
    const svc = new AnalyticsService(adminContext);
    const scope = await svc.resolveScope({ provinceId: PROVINCE_ID });
    await svc.run("TOTAL_PATIENTS", scope, RANGE);
    expect(repo.totalPatients).toHaveBeenCalledWith(
      expect.objectContaining({
        facilityIds: [GEO_FACILITY_A, GEO_FACILITY_B],
      }),
    );
  });

  it("uses the admin's per-request facilityId override", async () => {
    const repo = mockRepo();
    const svc = new AnalyticsService(adminContext);
    const scope = await svc.resolveScope({ facilityId: OTHER_FACILITY_ID });
    await svc.run("TOTAL_OPD", scope, RANGE);
    expect(repo.totalOpd).toHaveBeenCalledWith(
      expect.objectContaining({ facilityIds: [OTHER_FACILITY_ID] }),
    );
  });

  it("SECTOR_WISE_REFERRALS forwards the facility filter to sectorWiseReferrals", async () => {
    const repo = mockRepo();
    const svc = new AnalyticsService(doctorContext);
    const scope = await svc.resolveScope({});
    await svc.run("SECTOR_WISE_REFERRALS", scope, RANGE);
    expect(repo.sectorWiseReferrals).toHaveBeenCalledWith(
      expect.objectContaining({ facilityIds: [FACILITY_ID] }),
    );
  });

  it("SECTOR_WISE_REFERRALS with admin + scope=all omits the facility filter", async () => {
    const repo = mockRepo();
    const svc = new AnalyticsService(adminContext);
    const scope = await svc.resolveScope({ facilityId: "all" });
    await svc.run("SECTOR_WISE_REFERRALS", scope, RANGE);
    const arg = repo.sectorWiseReferrals.mock.calls[0][0];
    expect(arg.facilityIds).toBeUndefined();
  });

  it("CHART_DATA_FOR_MALE_AND_FEMALE_BY_AGE_RANGE aliases to ageGenderDistribution", async () => {
    const repo = mockRepo();
    const svc = new AnalyticsService(doctorContext);
    const scope = await svc.resolveScope({});
    await svc.run(
      "CHART_DATA_FOR_MALE_AND_FEMALE_BY_AGE_RANGE",
      scope,
      RANGE,
    );
    expect(repo.ageGenderDistribution).toHaveBeenCalledTimes(1);
    expect(repo.ageGenderDistribution).toHaveBeenCalledWith(
      expect.objectContaining({ facilityIds: [FACILITY_ID] }),
    );
  });

  it("MORBIDITY_TREND forwards the limit param with a default of 3", async () => {
    const repo = mockRepo();
    const svc = new AnalyticsService(doctorContext);
    const scope = await svc.resolveScope({});

    await svc.run("MORBIDITY_TREND", scope, RANGE);
    expect(repo.morbidityTrend).toHaveBeenLastCalledWith(
      expect.any(Object),
      3,
    );

    await svc.run("MORBIDITY_TREND", scope, { ...RANGE, limit: "7" });
    expect(repo.morbidityTrend).toHaveBeenLastCalledWith(
      expect.any(Object),
      7,
    );
  });

  it("TOP_DISEASES forwards the limit param with a default of 10", async () => {
    const repo = mockRepo();
    const svc = new AnalyticsService(doctorContext);
    const scope = await svc.resolveScope({});

    await svc.run("TOP_DISEASES", scope, RANGE);
    expect(repo.topDiseases).toHaveBeenLastCalledWith(expect.any(Object), 10);

    await svc.run("TOP_DISEASES", scope, { ...RANGE, limit: "25" });
    expect(repo.topDiseases).toHaveBeenLastCalledWith(
      expect.any(Object),
      25,
    );
  });

  it("rejects a TOP_DISEASES limit outside the allowed range", async () => {
    mockRepo();
    const svc = new AnalyticsService(doctorContext);
    const scope = await svc.resolveScope({});
    await expect(
      svc.run("TOP_DISEASES", scope, { ...RANGE, limit: "0" }),
    ).rejects.toThrow(/Validation failed/);
    await expect(
      svc.run("TOP_DISEASES", scope, { ...RANGE, limit: "9999" }),
    ).rejects.toThrow(/Validation failed/);
  });

  it("each telehealth method passes the matching service tag to the repo", async () => {
    const repo = mockRepo();
    const svc = new AnalyticsService(doctorContext);
    const scope = await svc.resolveScope({});

    await svc.run("TELEHEALTH_REQUESTS_TOTAL", scope, RANGE);
    expect(repo.telehealthRequests).toHaveBeenLastCalledWith(
      expect.objectContaining({ facilityIds: [FACILITY_ID] }),
      null,
    );

    await svc.run("TELEHEALTH_REQUESTS_OPD", scope, RANGE);
    expect(repo.telehealthRequests).toHaveBeenLastCalledWith(
      expect.any(Object),
      "opd",
    );

    await svc.run("TELEHEALTH_REQUESTS_MATERNAL", scope, RANGE);
    expect(repo.telehealthRequests).toHaveBeenLastCalledWith(
      expect.any(Object),
      "maternal",
    );

    await svc.run("TELEHEALTH_REQUESTS_CHILD", scope, RANGE);
    expect(repo.telehealthRequests).toHaveBeenLastCalledWith(
      expect.any(Object),
      "child",
    );
  });

  it("returns the parsed date range alongside the result", async () => {
    mockRepo();
    const svc = new AnalyticsService(doctorContext);
    const scope = await svc.resolveScope({});
    const out = await svc.run("TOTAL_PATIENTS", scope, RANGE);
    expect(out.range.from.toISOString()).toBe("2025-05-18T00:00:00.000Z");
    expect(out.range.to.toISOString()).toBe("2026-05-18T00:00:00.000Z");
  });

  it("treats toDate as the inclusive last UTC day — repo receives the next-day midnight", async () => {
    const repo = mockRepo();
    const svc = new AnalyticsService(doctorContext);
    const scope = await svc.resolveScope({});
    await svc.run("TOTAL_PATIENTS", scope, RANGE);
    const arg = repo.totalPatients.mock.calls[0][0];
    // Caller sent toDate = 2026-05-18T00:00:00Z; repo should see the next
    // midnight so same-day rows aren't silently excluded.
    expect(arg.toExclusive.toISOString()).toBe("2026-05-19T00:00:00.000Z");
    expect(arg.from.toISOString()).toBe("2025-05-18T00:00:00.000Z");
  });

  it("supports a single-day request (fromDate == toDate)", async () => {
    const repo = mockRepo();
    const svc = new AnalyticsService(doctorContext);
    const scope = await svc.resolveScope({});
    await svc.run("TOTAL_PATIENTS", scope, {
      fromDate: RANGE.toDate,
      toDate: RANGE.toDate,
    });
    const arg = repo.totalPatients.mock.calls[0][0];
    expect(arg.from.toISOString()).toBe("2026-05-18T00:00:00.000Z");
    expect(arg.toExclusive.toISOString()).toBe("2026-05-19T00:00:00.000Z");
  });
});
