import { VisitRecordService } from "./visit-record.service";
import { FacilityContext } from "../../context/facility-context";
import { db } from "../../db";
import { VisitRepository } from "./visit.repository";

jest.mock("../db", () => ({
  db: {
    transaction: jest.fn(),
  },
}));

jest.mock("../repositories/visit.repository");

describe("VisitRecordService", () => {
  const context = { facilityId: "fac-1", userId: "user-1" } as FacilityContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates an encounter and vitals in one transaction", async () => {
    (VisitRepository as unknown as jest.Mock).mockImplementation(() => ({
      findById: jest.fn().mockResolvedValue({
        id: "visit-1",
        patientId: "patient-1",
        facilityId: "fac-1",
        service: null,
      }),
    }));

    const tx = {
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest
        .fn()
        .mockResolvedValueOnce([{ id: "enc-1" }])
        .mockResolvedValueOnce([{ id: "vitals-1" }]),
    };

    (db.transaction as unknown as jest.Mock).mockImplementation(
      async (fn: any) => fn(tx),
    );

    const service = new VisitRecordService(context);
    const result = await service.addVitals("visit-1", {
      temperature: 37,
      respiratoryRate: 20,
      spo2: 98,
    } as any);

    expect(tx.insert).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      encounter: { id: "enc-1" },
      record: { id: "vitals-1" },
    });
  });
});
