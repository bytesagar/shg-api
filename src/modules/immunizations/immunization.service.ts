import { FacilityContext } from "../../context/facility-context";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import { ImmunizationRepository } from "./immunization.repository";
import type {
  ChildImmunizationUpsertInput,
  ImmunizationHistoryCreateInput,
} from "./immunizations.validation";

export class ImmunizationService {
  private readonly repo: ImmunizationRepository;

  constructor(private readonly context: FacilityContext) {
    this.repo = new ImmunizationRepository(context);
  }

  public async upsertChildImmunizationProfile(
    patientId: string,
    input: ChildImmunizationUpsertInput,
  ) {
    return this.repo.upsertChildImmunizationProfile({
      patientId,
      ...input,
    });
  }

  public async createImmunizationHistory(
    patientId: string,
    input: ImmunizationHistoryCreateInput,
  ) {
    const dateAt = new Date(`${input.date}T00:00:00.000Z`);
    const vaccinatedDateAt =
      input.vaccinatedDate != null
        ? new Date(`${input.vaccinatedDate}T00:00:00.000Z`)
        : input.vaccinated
          ? dateAt
          : null;

    const created = await this.repo.createImmunizationHistoryForPatient({
      patientId,
      vaccineName: input.vaccineName,
      date: dateAt,
      vaccinated: input.vaccinated ? 1 : 0,
      vaccinatedDate: vaccinatedDateAt,
      aefi: input.aefi ?? null,
      createdBy: this.context.userId,
      updatedBy: this.context.userId,
    });

    if (!created) {
      throw new AppError(
        "Child immunization profile not found. Create it first.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    return created;
  }
}
