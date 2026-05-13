import { FacilityContext } from "@/context/facility-context";
import { ImnciVisitService } from "./imnci-visit.service";
import { ImnciVisitRepository } from "./imnci-visit.repository";
import { ImnciChartBookletRepository } from "./imnci-chart-booklet.repository";

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock("./imnci-visit.repository");
jest.mock("./imnci-chart-booklet.repository");

const context: FacilityContext = {
  facilityId: "fac-1",
  userId: "user-1",
  role: "doctor",
  userType: "doctor",
};

const VISIT_ID = "11111111-1111-1111-1111-111111111111";

// Mock containers are typed `any` so partial stubs don't have to satisfy the
// full Drizzle row types. Service-level tests only assert on the fields they
// stub, not on the schema-inferred shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Mocked = Record<string, jest.Mock<any, any>>;

function mockRepos(): { visitMock: Mocked; bookletMock: Mocked } {
  const visitMock: Mocked = {
    findPatientForVisit: jest.fn(),
    createVisit: jest.fn(),
    findById: jest.fn(),
    findAnswers: jest.fn().mockResolvedValue([]),
    findClassifications: jest.fn().mockResolvedValue([]),
    findPlanItems: jest.fn().mockResolvedValue([]),
    upsertAnswers: jest.fn(),
    getLatestAnswers: jest.fn().mockResolvedValue({}),
    replaceEngineResults: jest.fn(),
    confirmPlanItems: jest.fn(),
    createReferral: jest.fn(),
    list: jest.fn(),
    scheduleFollowUps: jest.fn(),
  };
  const bookletMock: Mocked = {
    findActiveForFacility: jest.fn(),
    findBookletById: jest.fn(),
    findQuestionsByBooklet: jest.fn().mockResolvedValue([]),
    findClassificationRulesByBooklet: jest.fn().mockResolvedValue([]),
    findTreatmentRulesByBooklet: jest.fn().mockResolvedValue([]),
    findFormularyByBooklet: jest.fn().mockResolvedValue([]),
    findCounsellingByBooklet: jest.fn().mockResolvedValue([]),
  };
  (ImnciVisitRepository as unknown as jest.Mock).mockImplementation(() => visitMock);
  (ImnciChartBookletRepository as unknown as jest.Mock).mockImplementation(
    () => bookletMock,
  );
  return { visitMock, bookletMock };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ImnciVisitService.startVisit", () => {
  function dobNMonthsAgo(months: number): Date {
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return d;
  }

  it("routes a 1-month-old to the young_infant pathway", async () => {
    const { visitMock, bookletMock } = mockRepos();
    visitMock.findPatientForVisit.mockResolvedValue({
      patientId: "p-1",
      facilityId: "fac-1",
      birthDate: dobNMonthsAgo(1),
    });
    bookletMock.findActiveForFacility.mockResolvedValue({
      id: "book-1",
      versionCode: "STUB",
    });
    visitMock.createVisit.mockResolvedValue({ id: VISIT_ID });

    const service = new ImnciVisitService(context);
    const result = await service.startVisit({ patientId: "p-1" });

    expect(result.pathway).toBe("young_infant");
    expect(visitMock.createVisit).toHaveBeenCalledWith(
      expect.objectContaining({ pathway: "young_infant", bookletId: "book-1" }),
      "user-1",
    );
  });

  it("routes a 30-month-old to the sick_child pathway", async () => {
    const { visitMock, bookletMock } = mockRepos();
    visitMock.findPatientForVisit.mockResolvedValue({
      patientId: "p-1",
      facilityId: "fac-1",
      birthDate: dobNMonthsAgo(30),
    });
    bookletMock.findActiveForFacility.mockResolvedValue({
      id: "book-1",
      versionCode: "STUB",
    });
    visitMock.createVisit.mockResolvedValue({ id: VISIT_ID });

    const service = new ImnciVisitService(context);
    const result = await service.startVisit({ patientId: "p-1" });

    expect(result.pathway).toBe("sick_child");
  });

  it("rejects patients aged 5 years or older", async () => {
    const { visitMock, bookletMock } = mockRepos();
    visitMock.findPatientForVisit.mockResolvedValue({
      patientId: "p-1",
      facilityId: "fac-1",
      birthDate: dobNMonthsAgo(72),
    });
    bookletMock.findActiveForFacility.mockResolvedValue({ id: "book-1" });

    const service = new ImnciVisitService(context);
    await expect(service.startVisit({ patientId: "p-1" })).rejects.toThrow(
      /not in the CB-IMNCI age range/i,
    );
    expect(visitMock.createVisit).not.toHaveBeenCalled();
  });

  it("rejects patients with unknown birth date", async () => {
    const { visitMock } = mockRepos();
    visitMock.findPatientForVisit.mockResolvedValue({
      patientId: "p-1",
      facilityId: "fac-1",
      birthDate: null,
    });

    const service = new ImnciVisitService(context);
    await expect(service.startVisit({ patientId: "p-1" })).rejects.toThrow(
      /birth date is unknown/i,
    );
  });

  it("rejects when no active booklet is configured", async () => {
    const { visitMock, bookletMock } = mockRepos();
    visitMock.findPatientForVisit.mockResolvedValue({
      patientId: "p-1",
      facilityId: "fac-1",
      birthDate: dobNMonthsAgo(20),
    });
    bookletMock.findActiveForFacility.mockResolvedValue(null);

    const service = new ImnciVisitService(context);
    await expect(service.startVisit({ patientId: "p-1" })).rejects.toThrow(
      /no active.*booklet/i,
    );
  });

  it("rejects when the patient is not found at this facility", async () => {
    const { visitMock } = mockRepos();
    visitMock.findPatientForVisit.mockResolvedValue(null);

    const service = new ImnciVisitService(context);
    await expect(service.startVisit({ patientId: "p-1" })).rejects.toThrow(
      /patient not found/i,
    );
  });
});

describe("ImnciVisitService.classifyVisit", () => {
  it("replays safely: runs engine, persists engine-source results via replaceEngineResults", async () => {
    const { visitMock, bookletMock } = mockRepos();
    visitMock.findById.mockResolvedValue({
      id: VISIT_ID,
      bookletId: "book-1",
      pathway: "sick_child",
      ageMonthsAtVisit: 24,
      weightKg: 11,
      status: "in_progress",
    });
    bookletMock.findClassificationRulesByBooklet.mockResolvedValue([
      {
        id: "rule-1",
        pathway: "sick_child",
        section: "cough",
        classificationCode: "PNEUMONIA",
        severity: "yellow",
        priority: 2,
        predicate: {
          and: [
            { field: "answers.cough.present", op: "=", value: true },
            { field: "answers.cough.fast_breathing", op: "=", value: true },
          ],
        },
      },
    ]);
    bookletMock.findTreatmentRulesByBooklet.mockResolvedValue([]);
    bookletMock.findFormularyByBooklet.mockResolvedValue([]);
    visitMock.getLatestAnswers.mockResolvedValue({
      "cough.present": true,
      "cough.fast_breathing": true,
    });

    const service = new ImnciVisitService(context);
    await service.classifyVisit(VISIT_ID);

    expect(visitMock.replaceEngineResults).toHaveBeenCalledTimes(1);
    const [, classifications] = visitMock.replaceEngineResults.mock.calls[0];
    expect(classifications).toHaveLength(1);
    expect(classifications[0]).toMatchObject({
      classificationCode: "PNEUMONIA",
      severity: "yellow",
      section: "cough",
      ruleIdSnapshot: "rule-1",
      referralRequired: false,
    });
  });

  it("filters classification rules to the visit's pathway", async () => {
    const { visitMock, bookletMock } = mockRepos();
    visitMock.findById.mockResolvedValue({
      id: VISIT_ID,
      bookletId: "book-1",
      pathway: "sick_child",
      ageMonthsAtVisit: 24,
      weightKg: 11,
      status: "in_progress",
    });
    bookletMock.findClassificationRulesByBooklet.mockResolvedValue([
      {
        id: "rule-young",
        pathway: "young_infant",
        section: "cough",
        classificationCode: "PSBI",
        severity: "pink",
        priority: 1,
        predicate: { field: "answers.cough.present", op: "=", value: true },
      },
    ]);
    bookletMock.findTreatmentRulesByBooklet.mockResolvedValue([]);
    bookletMock.findFormularyByBooklet.mockResolvedValue([]);
    visitMock.getLatestAnswers.mockResolvedValue({ "cough.present": true });

    const service = new ImnciVisitService(context);
    await service.classifyVisit(VISIT_ID);

    const [, classifications] = visitMock.replaceEngineResults.mock.calls[0];
    expect(classifications).toEqual([]);
  });

  it("refuses to classify a completed visit", async () => {
    const { visitMock } = mockRepos();
    visitMock.findById.mockResolvedValue({
      id: VISIT_ID,
      status: "completed",
      bookletId: "book-1",
      pathway: "sick_child",
      ageMonthsAtVisit: 24,
    });

    const service = new ImnciVisitService(context);
    await expect(service.classifyVisit(VISIT_ID)).rejects.toThrow(
      /already completed/i,
    );
  });
});

describe("ImnciVisitService.refer", () => {
  it("rejects when no pink-severity classification exists", async () => {
    const { visitMock } = mockRepos();
    visitMock.findById.mockResolvedValue({
      id: VISIT_ID,
      patientId: "p-1",
      status: "classified",
    });
    visitMock.findClassifications.mockResolvedValue([
      { classificationCode: "PNEUMONIA", severity: "yellow", section: "cough" },
    ]);

    const service = new ImnciVisitService(context);
    await expect(
      service.refer(VISIT_ID, { reason: "test" }),
    ).rejects.toThrow(/pink-severity/i);
    expect(visitMock.createReferral).not.toHaveBeenCalled();
  });

  it("creates a referral when a pink classification is present", async () => {
    const { visitMock } = mockRepos();
    visitMock.findById.mockResolvedValue({
      id: VISIT_ID,
      patientId: "p-1",
      status: "classified",
    });
    visitMock.findClassifications.mockResolvedValue([
      { classificationCode: "SEVERE_PNEUMONIA", severity: "pink", section: "cough" },
    ]);
    visitMock.createReferral.mockResolvedValue({ id: "ref-1" });

    const service = new ImnciVisitService(context);
    const result = await service.refer(VISIT_ID, { reason: "severe pneumonia" });

    expect(result).toEqual({ id: "ref-1" });
    expect(visitMock.createReferral).toHaveBeenCalledTimes(1);
  });
});

describe("ImnciVisitService.confirmTreatmentPlan", () => {
  it("requires the visit to be in classified state", async () => {
    const { visitMock } = mockRepos();
    visitMock.findById.mockResolvedValue({
      id: VISIT_ID,
      status: "in_progress",
      bookletId: "book-1",
    });

    const service = new ImnciVisitService(context);
    await expect(
      service.confirmTreatmentPlan(VISIT_ID, {
        items: [
          {
            id: "00000000-0000-0000-0000-000000000001",
            status: "confirmed",
          },
        ],
      }),
    ).rejects.toThrow(/must be classified/i);
  });
});

describe("ImnciVisitService.saveAnswers", () => {
  it("rejects edits on a referred visit", async () => {
    const { visitMock } = mockRepos();
    visitMock.findById.mockResolvedValue({ id: VISIT_ID, status: "referred" });

    const service = new ImnciVisitService(context);
    await expect(
      service.saveAnswers(VISIT_ID, {
        answers: [{ questionKey: "cough.present", value: true }],
      }),
    ).rejects.toThrow(/finalized/i);
  });

  it("dispatches values by type into the right column", async () => {
    const { visitMock } = mockRepos();
    visitMock.findById.mockResolvedValue({ id: VISIT_ID, status: "in_progress" });

    const service = new ImnciVisitService(context);
    await service.saveAnswers(VISIT_ID, {
      answers: [
        { questionKey: "cough.present", value: true },
        { questionKey: "cough.duration_days", value: 7 },
        { questionKey: "notes", value: "hello" },
        { questionKey: "skipped", value: null },
      ],
    });

    expect(visitMock.upsertAnswers).toHaveBeenCalledWith(
      VISIT_ID,
      [
        { questionKey: "cough.present", valueBool: true },
        { questionKey: "cough.duration_days", valueInt: 7 },
        { questionKey: "notes", valueText: "hello" },
        { questionKey: "skipped" },
      ],
      "user-1",
    );
  });
});
