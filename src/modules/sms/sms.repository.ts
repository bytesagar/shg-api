import { eq } from "drizzle-orm";
import { db } from "../../db";
import { sms_logs } from "../../db/schema";
import { FacilityRepository } from "../../core/facility-repository";
import { FacilityContext } from "../../context/facility-context";
import { SMS_STATUS } from "./sms.status";

/**
 * Facility-scoped persistence for the `sms_logs` audit trail. Every read goes
 * through `withFacilityScope` per the tenancy contract; writes always stamp the
 * context's facilityId.
 */
export class SmsRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, sms_logs.facilityId);
  }

  /** Insert a PENDING row and return its id. */
  async createPending(params: {
    phone: string;
    body: string;
    patientId?: string | null;
    templateKey?: string | null;
    scheduleDate?: Date | null;
  }): Promise<string> {
    const [row] = await db
      .insert(sms_logs)
      .values({
        facilityId: this.context.facilityId,
        patientId: params.patientId ?? null,
        phone: params.phone,
        smsBody: params.body,
        templateKey: params.templateKey ?? null,
        scheduleDate: params.scheduleDate ?? null,
        status: SMS_STATUS.PENDING,
        createdBy: this.context.userId,
      })
      .returning({ id: sms_logs.id });
    return row.id;
  }

  async markSent(id: string, providerMessageId?: string, provider?: string) {
    await db
      .update(sms_logs)
      .set({
        status: SMS_STATUS.SENT,
        providerMessageId: providerMessageId ?? null,
        provider: provider ?? null,
        sentAt: new Date(),
        deliveryDate: new Date(),
        updatedAt: new Date(),
        updatedBy: this.context.userId,
      })
      .where(this.withFacilityScope(eq(sms_logs.id, id)));
  }

  async markFailed(id: string, error: string, provider?: string) {
    await db
      .update(sms_logs)
      .set({
        status: SMS_STATUS.FAILED,
        error,
        provider: provider ?? null,
        updatedAt: new Date(),
        updatedBy: this.context.userId,
      })
      .where(this.withFacilityScope(eq(sms_logs.id, id)));
  }
}
