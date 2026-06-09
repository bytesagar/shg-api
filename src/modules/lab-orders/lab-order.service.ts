import { db } from "@/db";
import { audit_events } from "@/db/schema";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";
import { HTTP_STATUS } from "@/config/constants";
import { FacilityContext } from "@/context/facility-context";

import { LabOrderRepository } from "./lab-order.repository";

import type {
  CollectSampleInput,
  CreateLabOrderInput,
  LabOrdersListQuery,
  RecordResultInput,
  UploadResultInput,
} from "./lab-order.validation";

export class LabOrderService {
  private readonly repository: LabOrderRepository;
  private readonly context: FacilityContext;

  constructor(context: FacilityContext) {
    this.context = context;
    this.repository = new LabOrderRepository(context);
  }

  public list(query: LabOrdersListQuery) {
    return this.repository.list(query);
  }

  public stats() {
    return this.repository.stats();
  }

  public async getById(id: string) {
    const row = await this.repository.findById(id);
    if (!row) {
      throw new AppError("Lab order not found.", HTTP_STATUS.NOT_FOUND);
    }
    return row;
  }

  public async create(input: CreateLabOrderInput) {
    const created = await this.repository.create(input);
    if (!created) {
      throw new AppError(
        "Failed to create lab order.",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
      );
    }
    await this.recordAudit("lab_order.create", created);
    return created;
  }

  public async collect(id: string, input: CollectSampleInput) {
    const updated = await this.repository.collect(id, input);
    if (!updated) {
      throw new AppError("Lab order not found.", HTTP_STATUS.NOT_FOUND);
    }
    await this.recordAudit("lab_order.collect", updated);
    return updated;
  }

  public async recordResult(id: string, input: RecordResultInput) {
    const updated = await this.repository.recordResult(id, input);
    if (!updated) {
      throw new AppError("Lab order not found.", HTTP_STATUS.NOT_FOUND);
    }
    await this.recordAudit("lab_order.result.record", updated);
    return updated;
  }

  public async uploadResult(id: string, input: UploadResultInput) {
    const updated = await this.repository.uploadResult(id, input);
    if (!updated) {
      throw new AppError("Lab order not found.", HTTP_STATUS.NOT_FOUND);
    }
    await this.recordAudit("lab_order.result.upload", updated);
    return updated;
  }

  /**
   * Persist an audit trail row for a lab-order mutation. Failures here must
   * never roll back the clinical action that already committed, so we swallow
   * and log rather than rethrow.
   */
  private async recordAudit(
    action: string,
    order: { id: unknown; patient: { id: unknown } },
  ) {
    const resourceId = order.id as string;
    const patientId = (order.patient.id as string | null) ?? null;
    try {
      await db.insert(audit_events).values({
        actorUserId: this.context.userId,
        action,
        resourceType: "LabOrder",
        resourceId,
        patientId,
        outcome: "success",
        facilityId: this.context.facilityId,
      });
      logger.audit(action, {
        userId: this.context.userId,
        resourceId,
        patientId,
        facilityId: this.context.facilityId,
      });
    } catch (err) {
      logger.error("lab_order.audit.persist_failed", { action, err });
    }
  }
}
