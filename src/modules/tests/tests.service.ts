import { FacilityContext } from "../../context/facility-context";
import { TestCategoryFilter, TestsRepository } from "./tests.repository";

export class TestsService {
  private readonly testsRepository: TestsRepository;

  constructor(private readonly context: FacilityContext) {
    this.testsRepository = new TestsRepository(context);
  }

  public async listTestsByPatientId(params: {
    patientId: string;
    visitId?: string;
    from?: string;
    to?: string;
    testCategory?: TestCategoryFilter;
    page: number;
    pageSize: number;
  }) {
    const items = await this.testsRepository.findByPatientId(params);
    return {
      items,
      page: params.page,
      pageSize: params.pageSize,
    };
  }
}
