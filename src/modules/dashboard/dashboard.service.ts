import { FacilityContext } from "../../context/facility-context";
import { DashboardRepository, DashboardSummary } from "./dashboard.repository";

export class DashboardService {
  private readonly repository: DashboardRepository;

  constructor(private readonly context: FacilityContext) {
    this.repository = new DashboardRepository();
  }

  public getSummary(): Promise<DashboardSummary> {
    return this.repository.getSummary(this.context.facilityId);
  }
}
