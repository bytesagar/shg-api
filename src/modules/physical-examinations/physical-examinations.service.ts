import { FacilityContext } from "../../context/facility-context";
import { PhysicalExaminationsRepository } from "./physical-examinations.repository";

export class PhysicalExaminationsService {
  private readonly physicalExaminationsRepository: PhysicalExaminationsRepository;

  constructor(private readonly context: FacilityContext) {
    this.physicalExaminationsRepository = new PhysicalExaminationsRepository(context);
  }

  public async listPhysicalExaminationsByPatientId(params: {
    patientId: string;
    visitId?: string;
    from?: string;
    to?: string;
    page: number;
    pageSize: number;
  }) {
    const items = await this.physicalExaminationsRepository.findByPatientId(params);
    return {
      items,
      page: params.page,
      pageSize: params.pageSize,
    };
  }
}
