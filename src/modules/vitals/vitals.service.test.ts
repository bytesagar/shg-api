import { FacilityContext } from "../../context/facility-context";
import { VitalsRepository } from "./vitals.repository";
import { VitalsService } from "./vitals.service";

jest.mock("./vitals.repository");

describe("VitalsService", () => {
  const context = { facilityId: "fac-1", userId: "user-1" } as FacilityContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns a paginated vitals history for a patient", async () => {
    const findByPatientId = jest.fn().mockResolvedValue([
      {
        id: "vitals-1",
        temperature: 36.9,
        respiratoryRate: 18,
        spo2: 98,
        visitId: "visit-1",
        encounterId: "enc-1",
        createdAt: new Date().toISOString(),
        updatedAt: null,
        encounterAt: null,
        encounterType: null,
        doctorId: null,
        visitDate: new Date().toISOString(),
      },
    ]);

    (VitalsRepository as unknown as jest.Mock).mockImplementation(() => ({
      findByPatientId,
    }));

    const service = new VitalsService(context);
    const result = await service.listVitalsByPatientId({
      patientId: "patient-1",
      page: 2,
      pageSize: 10,
    });

    expect(findByPatientId).toHaveBeenCalledWith({
      patientId: "patient-1",
      page: 2,
      pageSize: 10,
    });
    expect(result).toEqual({
      items: [
        {
          id: "vitals-1",
          temperature: 36.9,
          respiratoryRate: 18,
          spo2: 98,
          visitId: "visit-1",
          encounterId: "enc-1",
          createdAt: expect.any(String),
          updatedAt: null,
          encounterAt: null,
          encounterType: null,
          doctorId: null,
          visitDate: expect.any(String),
        },
      ],
      page: 2,
      pageSize: 10,
    });
  });
});
