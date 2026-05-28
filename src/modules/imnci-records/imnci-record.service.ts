import { FacilityContext } from "@/context/facility-context";
import { AppError } from "@/utils/app-error";
import { HTTP_STATUS } from "@/config/constants";

import { ImnciRecordRepository } from "./imnci-record.repository";

import type {
  ImnciRecordListQueryInput,
  ImnciRecordUpsertInput,
} from "./types";

export class ImnciRecordService {
  private readonly repository: ImnciRecordRepository;

  constructor(private readonly context: FacilityContext) {
    this.repository = new ImnciRecordRepository(context);
  }

  public async upsert(input: ImnciRecordUpsertInput) {
    const row = await this.repository.upsert(input, this.context.userId);
    if (!row) {
      // `onConflictDoUpdate.where` skipped the update because the id
      // already belongs to another facility — surface this clearly
      // rather than silently dropping the write.
      throw new AppError(
        "An IMNCI record with this id already exists in another facility.",
        HTTP_STATUS.CONFLICT,
      );
    }
    return row;
  }

  public async list(query: ImnciRecordListQueryInput) {
    return this.repository.list({
      page: query.page,
      pageSize: query.pageSize,
      patientId: query.patientId,
      ageBand: query.ageBand,
    });
  }

  public async getById(id: string) {
    const row = await this.repository.findById(id);
    if (!row) {
      throw new AppError("IMNCI record not found.", HTTP_STATUS.NOT_FOUND);
    }
    return row;
  }

  public async delete(id: string) {
    const removed = await this.repository.softDelete(id);
    if (!removed) {
      throw new AppError("IMNCI record not found.", HTTP_STATUS.NOT_FOUND);
    }
  }
}
