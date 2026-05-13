import { FacilityContext } from "@/context/facility-context";
import { AppError } from "@/utils/app-error";
import { HTTP_STATUS } from "@/config/constants";
import { ImnciFollowUpRepository } from "./imnci-followup.repository";

export class ImnciFollowUpService {
  private readonly repo: ImnciFollowUpRepository;

  constructor(private readonly context: FacilityContext) {
    this.repo = new ImnciFollowUpRepository(context);
  }

  public async list(params: {
    page: number;
    pageSize: number;
    status?: "scheduled" | "completed" | "missed";
    from?: string;
    to?: string;
    patientId?: string;
  }) {
    return this.repo.list(params);
  }

  public async complete(id: string, completedVisitId?: string) {
    const followUp = await this.repo.findById(id);
    if (!followUp) {
      throw new AppError("Follow-up not found", HTTP_STATUS.NOT_FOUND);
    }
    if (followUp.status !== "scheduled") {
      throw new AppError(
        `Follow-up is already ${followUp.status}`,
        HTTP_STATUS.CONFLICT,
      );
    }
    return this.repo.markComplete(id, completedVisitId);
  }
}
