import { FacilityContext } from "../../context/facility-context";
import { VitalsRepository } from "./vitals.repository";

export class VitalsService {
  private readonly vitalsRepository: VitalsRepository;

  constructor(private readonly context: FacilityContext) {
    this.vitalsRepository = new VitalsRepository(context);
  }

  public async listVitalsByPatientId(params: {
    patientId: string;
    page: number;
    pageSize: number;
  }) {
    const items = await this.vitalsRepository.findByPatientId(params);

    return {
      items,
      page: params.page,
      pageSize: params.pageSize,
    };
  }
}
