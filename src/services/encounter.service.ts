import { FacilityContext } from "../context/facility-context";
import { EncounterRepository } from "../repositories/encounter.repository";
import { PatientRepository } from "../repositories/patient.repository";
import { EncounterCreateInput } from "../validations/encounter.validation";

export class EncounterService {
  private encounterRepository: EncounterRepository;
  private patientRepository: PatientRepository;

  constructor(private readonly context: FacilityContext) {
    this.encounterRepository = new EncounterRepository(context);
    this.patientRepository = new PatientRepository(context);
  }

  public async createEncounter(input: EncounterCreateInput) {
    const patient = await this.patientRepository.findById(input.patientId);
    if (!patient) {
      return null;
    }

    return this.encounterRepository.create({
      patientId: patient.id,
      facilityId: this.context.facilityId,
      date: input.date ?? new Date(),
      reason: input.reason,
      service: input.service ?? null,
      status: input.status ?? null,
      doctorId: input.doctorId ?? null,
    });
  }

  public async getEncounterById(id: string) {
    return this.encounterRepository.findById(id);
  }
}
