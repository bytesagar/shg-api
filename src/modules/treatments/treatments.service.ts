import { FacilityContext } from "../../context/facility-context";
import { TreatmentsRepository } from "./treatments.repository";

export class TreatmentsService {
  private readonly treatmentsRepository: TreatmentsRepository;

  constructor(private readonly context: FacilityContext) {
    this.treatmentsRepository = new TreatmentsRepository(context);
  }

  public async listTreatmentsByPatientId(params: {
    patientId: string;
    visitId?: string;
    from?: string;
    to?: string;
    page: number;
    pageSize: number;
  }) {
    const items = await this.treatmentsRepository.findByPatientId(params);
    return {
      items,
      page: params.page,
      pageSize: params.pageSize,
    };
  }
}
