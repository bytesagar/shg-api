import { FacilityContext } from "../../context/facility-context";
import { ProvisionalDiagnosesRepository } from "./provisional-diagnoses.repository";

export class ProvisionalDiagnosesService {
  private readonly provisionalDiagnosesRepository: ProvisionalDiagnosesRepository;

  constructor(private readonly context: FacilityContext) {
    this.provisionalDiagnosesRepository = new ProvisionalDiagnosesRepository(context);
  }

  public async listProvisionalDiagnosesByPatientId(params: {
    patientId: string;
    visitId?: string;
    from?: string;
    to?: string;
    page: number;
    pageSize: number;
  }) {
    const items = await this.provisionalDiagnosesRepository.findByPatientId(params);
    return {
      items,
      page: params.page,
      pageSize: params.pageSize,
    };
  }
}
