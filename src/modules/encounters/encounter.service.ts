import { FacilityContext } from "../../context/facility-context";
import { EncounterRepository } from "./encounter.repository";
import { VisitRepository } from "../clinical-visits/visit.repository";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";

export class EncounterService {
  private readonly encounterRepository: EncounterRepository;
  private readonly visitRepository: VisitRepository;

  constructor(private readonly context: FacilityContext) {
    this.encounterRepository = new EncounterRepository(context);
    this.visitRepository = new VisitRepository(context);
  }

  public async getEncounterById(id: string) {
    const encounter = await this.encounterRepository.findById(id);
    if (!encounter) {
      throw new AppError("Encounter not found", HTTP_STATUS.NOT_FOUND);
    }
    return encounter;
  }

  public async getEncounters(params: {
    page: number;
    pageSize: number;
    visitId?: string;
    patientId?: string;
    doctorId?: string;
  }) {
    if (params.visitId) {
      const visit = await this.visitRepository.findById(params.visitId);
      if (!visit) {
        throw new AppError("Visit not found", HTTP_STATUS.NOT_FOUND);
      }
    }
    return this.encounterRepository.findAll(params);
  }
}
