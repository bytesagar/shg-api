import { FacilityContext } from "../../context/facility-context";
import { VisitRepository } from "./visit.repository";
import { PatientRepository } from "../patients/patient.repository";
import { VisitCreateInput } from "./visit.validation";
import { AppError } from "@/utils/app-error";
import { HTTP_STATUS } from "@/config/constants";


export class VisitService {
  private visitRepository: VisitRepository;
  private patientRepository: PatientRepository;

  constructor(private readonly context: FacilityContext) {
    this.visitRepository = new VisitRepository(context);
    this.patientRepository = new PatientRepository(context);
  }

  public async listVisits(patientId: string) {
    return { items: await this.visitRepository.findAllByPatientId(patientId) };
  }

  public async createVisit(input: VisitCreateInput) {
    const patient = await this.patientRepository.findById(input.patientId);
    if (!patient) {
      return null;
    }
    const activeVisit = await this.visitRepository.findActiveByPatientId(
      patient.id,
    );
    if (activeVisit) {
      throw new AppError(
        "Cannot create a new visit while another visit is active",
        HTTP_STATUS.CONFLICT,
      );
    }

    return this.visitRepository.create({
      patientId: patient.id,
      facilityId: this.context.facilityId,
      date: input.date ?? new Date(),
      reason: input.reason,
      service: input.service ?? null,
      status: input.status ?? "planned",
      doctorId: input.doctorId ?? null,
    });
  }

  public async getVisitById(id: string) {
    return this.visitRepository.findById(id);
  }

  public async updateVisitStatus(params: {
    visitId: string;
    status: "finished" | "cancelled";
  }) {
    const visit = await this.visitRepository.findById(params.visitId);
    if (!visit) return null;

    if (visit.status === params.status) return visit;

    if (visit.status === "finished" || visit.status === "cancelled") {
      throw new AppError("Visit is already ended", HTTP_STATUS.CONFLICT);
    }

    return this.visitRepository.updateStatus({
      id: params.visitId,
      status: params.status,
    });
  }
}
