import { FacilityContext } from "../../context/facility-context";
import { AppError } from "../../utils/app-error";
import { MedicationsController } from "./medications.controller";
import { MedicationsRepository } from "./medications.repository";
import { MedicationsService } from "./medications.service";

jest.mock("./medications.repository");

describe("MedicationsService", () => {
  const context = { facilityId: "fac-1", userId: "user-1" } as FacilityContext;
  let findByPatientId: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    findByPatientId = jest.fn().mockResolvedValue([]);
    (MedicationsRepository as unknown as jest.Mock).mockImplementation(() => ({
      findByPatientId,
    }));
  });

  it("forwards patientId-only filter and wraps in the standard envelope", async () => {
    findByPatientId.mockResolvedValueOnce([
      {
        id: "m-1",
        medicineName: "Paracetamol",
        dosage: "500mg",
        visitId: "v-1",
        encounterId: "e-1",
        createdAt: new Date().toISOString(),
        updatedAt: null,
        encounterAt: null,
        encounterType: "outpatient",
        doctorId: null,
        visitDate: "2026-05-10",
      },
    ]);

    const service = new MedicationsService(context);
    const result = await service.listMedicationsByPatientId({
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
    expect(result).toEqual(
      expect.objectContaining({ page: 1, pageSize: 30 }),
    );
  });

  it("forwards visitId filter when provided", async () => {
    const service = new MedicationsService(context);
    await service.listMedicationsByPatientId({
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
    const service = new MedicationsService(context);
    await service.listMedicationsByPatientId({
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

  it("returns an empty items array when no rows match", async () => {
    const service = new MedicationsService(context);
    const result = await service.listMedicationsByPatientId({
      patientId: "patient-1",
      page: 1,
      pageSize: 30,
    });
    expect(result.items).toEqual([]);
  });
});

describe("MedicationsController", () => {
  it("rejects requests without a facility context as unauthorized", async () => {
    const controller = new MedicationsController();
    const req = { query: { patientId: "p-1" } } as any;
    const res = {} as any;
    const next = jest.fn();

    await controller.getMedications(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(401);
  });
});
