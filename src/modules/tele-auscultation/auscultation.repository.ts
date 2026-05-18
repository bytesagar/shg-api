import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "../../db";
import { auscultation_sessions } from "../../db/schema";
import { FacilityContext } from "../../context/facility-context";
import { FacilityRepository } from "../../core/facility-repository";

export class AuscultationRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, auscultation_sessions.facilityId);
  }

  public async create(values: {
    id: string;
    patientId: string;
    doctorId: string;
    encounterId?: string | null;
    visitId?: string | null;
    appointmentId?: string | null;
    roomName: string;
  }) {
    const [row] = await db
      .insert(auscultation_sessions)
      .values({
        id: values.id,
        facilityId: this.context.facilityId,
        patientId: values.patientId,
        doctorId: values.doctorId,
        encounterId: values.encounterId ?? null,
        visitId: values.visitId ?? null,
        appointmentId: values.appointmentId ?? null,
        provider: "jitsi_jaas",
        roomName: values.roomName,
        status: "pending",
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return row ?? null;
  }

  public async findById(id: string) {
    const [row] = await db
      .select()
      .from(auscultation_sessions)
      .where(
        this.withFacilityScope(
          and(
            eq(auscultation_sessions.id, id),
            isNull(auscultation_sessions.deletedAt),
          ),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  public async markStarted(id: string, startedAt: Date) {
    const [row] = await db
      .update(auscultation_sessions)
      .set({
        status: "active",
        startedAt,
        updatedAt: new Date(),
        updatedBy: this.context.userId,
      })
      .where(
        this.withFacilityScope(
          and(
            eq(auscultation_sessions.id, id),
            isNull(auscultation_sessions.deletedAt),
          ),
        ),
      )
      .returning();
    return row ?? null;
  }

  public async markEnded(
    id: string,
    endedAt: Date,
    durationSeconds: number,
  ) {
    const [row] = await db
      .update(auscultation_sessions)
      .set({
        status: "ended",
        endedAt,
        durationSeconds,
        updatedAt: new Date(),
        updatedBy: this.context.userId,
      })
      .where(
        this.withFacilityScope(
          and(
            eq(auscultation_sessions.id, id),
            isNull(auscultation_sessions.deletedAt),
          ),
        ),
      )
      .returning();
    return row ?? null;
  }

  public async attachRecording(id: string, attachmentId: string) {
    const [row] = await db
      .update(auscultation_sessions)
      .set({
        recordingAttachmentId: attachmentId,
        updatedAt: new Date(),
        updatedBy: this.context.userId,
      })
      .where(
        this.withFacilityScope(
          and(
            eq(auscultation_sessions.id, id),
            isNull(auscultation_sessions.deletedAt),
          ),
        ),
      )
      .returning();
    return row ?? null;
  }

  public async list(params: {
    patientId?: string;
    encounterId?: string;
    visitId?: string;
    page: number;
    pageSize: number;
  }) {
    const filters = [isNull(auscultation_sessions.deletedAt)];
    if (params.patientId)
      filters.push(eq(auscultation_sessions.patientId, params.patientId));
    if (params.encounterId)
      filters.push(eq(auscultation_sessions.encounterId, params.encounterId));
    if (params.visitId)
      filters.push(eq(auscultation_sessions.visitId, params.visitId));
    const where = this.withFacilityScope(and(...filters));
    const offset = (params.page - 1) * params.pageSize;

    const [items, totalRow] = await Promise.all([
      db
        .select()
        .from(auscultation_sessions)
        .where(where)
        .orderBy(desc(auscultation_sessions.createdAt))
        .limit(params.pageSize)
        .offset(offset),
      db
        .select({ value: count() })
        .from(auscultation_sessions)
        .where(where),
    ]);

    return { items, total: totalRow[0]?.value ?? 0 };
  }
}
