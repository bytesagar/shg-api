import { FacilityContext } from "../../context/facility-context";
import { ConfirmDiagnosesRepository } from "./confirm-diagnoses.repository";

export class ConfirmDiagnosesService {
  private readonly confirmDiagnosesRepository: ConfirmDiagnosesRepository;

  constructor(private readonly context: FacilityContext) {
    this.confirmDiagnosesRepository = new ConfirmDiagnosesRepository(context);
  }

  public async listConfirmDiagnosesByPatientId(params: {
    patientId: string;
    visitId?: string;
    from?: string;
    to?: string;
    page: number;
    pageSize: number;
  }) {
    const items = await this.confirmDiagnosesRepository.findByPatientId(params);
    return {
      items,
      page: params.page,
      pageSize: params.pageSize,
    };
  }
}
