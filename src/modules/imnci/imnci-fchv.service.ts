import { z } from "zod";
import { FacilityContext } from "@/context/facility-context";
import { AppError } from "@/utils/app-error";
import { HTTP_STATUS } from "@/config/constants";
import { ImnciFchvRepository } from "./imnci-fchv.repository";
import {
  fchvDispenseSchema,
  fchvScreeningCreateSchema,
} from "./imnci.validation";

export class ImnciFchvService {
  private readonly repo: ImnciFchvRepository;

  constructor(private readonly context: FacilityContext) {
    this.repo = new ImnciFchvRepository(context);
  }

  public async createScreening(input: z.infer<typeof fchvScreeningCreateSchema>) {
    return this.repo.createScreening(
      {
        patientId: input.patientId,
        visitedAt: input.visitedAt ? new Date(input.visitedAt) : undefined,
        location: input.location,
        dangerSignsFound: input.dangerSignsFound,
        referralRecommended: input.referralRecommended,
        referralUrgency: input.referralUrgency,
        notes: input.notes,
      },
      this.context.userId,
    );
  }

  public async dispense(
    screeningId: string,
    input: z.infer<typeof fchvDispenseSchema>,
  ) {
    const screening = await this.repo.findScreeningById(screeningId);
    if (!screening) {
      throw new AppError("Screening not found", HTTP_STATUS.NOT_FOUND);
    }
    if (screening.fchvUserId !== this.context.userId) {
      // FCHVs can only attach commodities to their own screenings.
      throw new AppError(
        "Cannot dispense against another FCHV's screening",
        HTTP_STATUS.FORBIDDEN,
      );
    }
    return this.repo.dispense(screeningId, {
      commodity: input.commodity,
      quantity: input.quantity,
      unit: input.unit,
      batchNo: input.batchNo,
      dispensedAt: input.dispensedAt ? new Date(input.dispensedAt) : undefined,
    });
  }

  public async listMyScreenings(params: {
    page: number;
    pageSize: number;
    from?: string;
    to?: string;
    referralRecommended?: boolean;
  }) {
    return this.repo.listScreenings({
      ...params,
      fchvUserId: this.context.userId,
    });
  }
}
