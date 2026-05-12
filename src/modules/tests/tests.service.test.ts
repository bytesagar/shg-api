import { FacilityContext } from "../../context/facility-context";
import { AppError } from "../../utils/app-error";
import { TestsController } from "./tests.controller";
import { TestsRepository } from "./tests.repository";
import { TestsService } from "./tests.service";

jest.mock("./tests.repository");

describe("TestsService", () => {
  const context = { facilityId: "fac-1", userId: "user-1" } as FacilityContext;
  let findByPatientId: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    findByPatientId = jest.fn().mockResolvedValue([]);
    (TestsRepository as unknown as jest.Mock).mockImplementation(() => ({
      findByPatientId,
    }));
  });

  it("forwards patientId-only filter and wraps in the standard envelope", async () => {
    findByPatientId.mockResolvedValueOnce([
      {
        id: "t-1",
        testName: "CBC",
        testResult: "WNL",
        testCategory: "lab",
        visitId: "v-1",
        encounterId: null,
        createdAt: new Date().toISOString(),
        updatedAt: null,
        encounterAt: null,
        encounterType: null,
        doctorId: null,
        visitDate: "2026-05-10",
      },
    ]);

    const service = new TestsService(context);
    const result = await service.listTestsByPatientId({
      patientId: "patient-1",
      page: 1,
      pageSize: 30,
    });

    expect(findByPatientId).toHaveBeenCalledWith({
      patientId: "patient-1",
      page: 1,
      pageSize: 30,
    });
    expect(result.items).toHaveLength(1);
  });

  it("forwards visitId filter when provided", async () => {
    const service = new TestsService(context);
    await service.listTestsByPatientId({
      patientId: "patient-1",
      visitId: "visit-9",
      page: 1,
      pageSize: 30,
    });
    expect(findByPatientId).toHaveBeenCalledWith(
      expect.objectContaining({ visitId: "visit-9" }),
    );
  });

  it("forwards from/to date range when provided", async () => {
    const service = new TestsService(context);
    await service.listTestsByPatientId({
      patientId: "patient-1",
      from: "2026-01-01",
      to: "2026-05-10",
      page: 1,
      pageSize: 30,
    });
    expect(findByPatientId).toHaveBeenCalledWith(
      expect.objectContaining({ from: "2026-01-01", to: "2026-05-10" }),
    );
  });

  it("forwards testCategory filter when provided (lab)", async () => {
    const service = new TestsService(context);
    await service.listTestsByPatientId({
      patientId: "patient-1",
      testCategory: "lab",
      page: 1,
      pageSize: 30,
    });
    expect(findByPatientId).toHaveBeenCalledWith(
      expect.objectContaining({ testCategory: "lab" }),
    );
  });

  it("forwards testCategory filter when provided (imaging)", async () => {
    const service = new TestsService(context);
    await service.listTestsByPatientId({
      patientId: "patient-1",
      testCategory: "imaging",
      page: 1,
      pageSize: 30,
    });
    expect(findByPatientId).toHaveBeenCalledWith(
      expect.objectContaining({ testCategory: "imaging" }),
    );
  });

  it("returns an empty items array when no rows match", async () => {
    const service = new TestsService(context);
    const result = await service.listTestsByPatientId({
      patientId: "patient-1",
      page: 1,
      pageSize: 30,
    });
    expect(result.items).toEqual([]);
  });
});

describe("TestsController", () => {
  it("rejects requests without a facility context as unauthorized", async () => {
    const controller = new TestsController();
    const req = { query: { patientId: "p-1" } } as any;
    const res = {} as any;
    const next = jest.fn();

    await controller.getTests(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(401);
  });
});
