import { FacilityContext } from "../../context/facility-context";
import { MedicationsRepository } from "./medications.repository";

export class MedicationsService {
  private readonly medicationsRepository: MedicationsRepository;

  constructor(private readonly context: FacilityContext) {
    this.medicationsRepository = new MedicationsRepository(context);
  }

  public async listMedicationsByPatientId(params: {
    patientId: string;
    visitId?: string;
    from?: string;
    to?: string;
    page: number;
    pageSize: number;
  }) {
    const items = await this.medicationsRepository.findByPatientId(params);
    return {
      items,
      page: params.page,
      pageSize: params.pageSize,
    };
  }
}
