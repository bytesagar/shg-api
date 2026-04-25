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
    const activeVisit = await this.visitRepository.findByPatientId(patient.id);
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
      status: input.status ?? null,
      doctorId: input.doctorId ?? null,
    });
  }

  public async getVisitById(id: string) {
    return this.visitRepository.findById(id);
  }
}
