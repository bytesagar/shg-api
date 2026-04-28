import { FacilityContext } from "../../context/facility-context";
import { PatientRepository } from "../patients/patient.repository";
import { VisitRepository } from "./visit.repository";
import { VisitService } from "./visit.service";

jest.mock("./visit.repository");
jest.mock("../patients/patient.repository");

describe("VisitService", () => {
  const context = { facilityId: "fac-1", userId: "user-1" } as FacilityContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates visit status to finished", async () => {
    (PatientRepository as unknown as jest.Mock).mockImplementation(() => ({}));

    const findById = jest.fn().mockResolvedValue({
      id: "visit-1",
      status: "in_progress",
    });
    const updateStatus = jest.fn().mockResolvedValue({
      id: "visit-1",
      status: "finished",
    });

    (VisitRepository as unknown as jest.Mock).mockImplementation(() => ({
      findById,
      updateStatus,
    }));

    const service = new VisitService(context);
    const result = await service.updateVisitStatus({
      visitId: "visit-1",
      status: "finished",
    });

    expect(findById).toHaveBeenCalledWith("visit-1");
    expect(updateStatus).toHaveBeenCalledWith({
      id: "visit-1",
      status: "finished",
    });
    expect(result).toEqual({ id: "visit-1", status: "finished" });
  });

  it("allows creating a new visit after the previous one is ended", async () => {
    const patientRepositoryFindById = jest.fn().mockResolvedValue({
      id: "patient-1",
    });
    (PatientRepository as unknown as jest.Mock).mockImplementation(() => ({
      findById: patientRepositoryFindById,
    }));

    const findActiveByPatientId = jest.fn().mockResolvedValue(null);
    const create = jest.fn().mockResolvedValue({
      id: "visit-2",
      patientId: "patient-1",
      status: "planned",
    });

    (VisitRepository as unknown as jest.Mock).mockImplementation(() => ({
      findActiveByPatientId,
      create,
    }));

    const service = new VisitService(context);
    const result = await service.createVisit({
      patientId: "patient-1",
      reason: "Follow up",
      date: null,
      service: null,
      status: null,
      doctorId: null,
    });

    expect(findActiveByPatientId).toHaveBeenCalledWith("patient-1");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: "patient-1",
        facilityId: "fac-1",
        reason: "Follow up",
        status: "planned",
      }),
    );
    expect(result).toEqual({
      id: "visit-2",
      patientId: "patient-1",
      status: "planned",
    });
  });
});
