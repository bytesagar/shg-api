import { FacilityContext } from "../../context/facility-context";
import { ComplaintsRepository } from "./complaints.repository";

export class ComplaintsService {
  private readonly complaintsRepository: ComplaintsRepository;

  constructor(private readonly context: FacilityContext) {
    this.complaintsRepository = new ComplaintsRepository(context);
  }

  public async listComplaintsByPatientId(params: {
    patientId: string;
    visitId?: string;
    from?: string;
    to?: string;
    page: number;
    pageSize: number;
  }) {
    const items = await this.complaintsRepository.findByPatientId(params);
    return {
      items,
      page: params.page,
      pageSize: params.pageSize,
    };
  }
}
