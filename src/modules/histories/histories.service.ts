import { FacilityContext } from "../../context/facility-context";
import { HistoriesRepository } from "./histories.repository";

export class HistoriesService {
  private readonly historiesRepository: HistoriesRepository;

  constructor(private readonly context: FacilityContext) {
    this.historiesRepository = new HistoriesRepository(context);
  }

  public async listHistoriesByPatientId(params: {
    patientId: string;
    visitId?: string;
    from?: string;
    to?: string;
    page: number;
    pageSize: number;
  }) {
    const items = await this.historiesRepository.findByPatientId(params);
    return {
      items,
      page: params.page,
      pageSize: params.pageSize,
    };
  }
}
