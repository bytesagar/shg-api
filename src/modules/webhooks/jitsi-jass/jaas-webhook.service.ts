import { z } from "zod";
import { db } from "../../../db";
import {
  jaas_webhook_idempotency,
  telehealth_sessions,
} from "../../../db/schema";
import { eq } from "drizzle-orm";

const UUID_RE =
  /^shg-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

const jaasWebhookPayloadSchema = z.object({
  idempotencyKey: z.string().min(1),
  eventType: z.string(),
  sessionId: z.string().optional(),
  timestamp: z.number(),
  fqn: z.string().min(1),
  data: z
    .object({
      isBreakout: z.boolean().optional(),
    })
    .passthrough()
    .optional(),
});

export type JaasWebhookPayload = z.infer<typeof jaasWebhookPayloadSchema>;

/** Extract `shg-{uuid}` room segment from JaaS `fqn` (`AppID/roomName`). */
export function parseAppointmentIdFromFqn(fqn: string): string | null {
  const segment = fqn.split("/").pop();
  if (!segment) return null;
  const m = segment.match(UUID_RE);
  return m ? m[1]! : null;
}

function computeDurationSeconds(startedAt: Date, endedAt: Date): number {
  const s = startedAt.getTime();
  const e = endedAt.getTime();
  if (e >= s) return Math.floor((e - s) / 1000);
  return 0;
}

export class JaasWebhookService {
  parsePayload(raw: unknown):
    | { ok: true; payload: JaasWebhookPayload }
    | { ok: false; error: string } {
    const result = jaasWebhookPayloadSchema.safeParse(raw);
    if (!result.success) {
      const msg = result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return { ok: false, error: msg };
    }
    return { ok: true, payload: result.data };
  }

  /**
   * Process webhook: idempotent insert, then update telehealth_sessions for
   * ROOM_CREATED / ROOM_DESTROYED. Returns duplicate if idempotency key seen.
   */
  async handleEvent(payload: JaasWebhookPayload): Promise<
    | { duplicate: true }
    | { skipped: true; reason: string }
    | { applied: true }
  > {
    if (payload.data?.isBreakout === true) {
      return { skipped: true, reason: "breakout_room" };
    }

    if (
      payload.eventType !== "ROOM_CREATED" &&
      payload.eventType !== "ROOM_DESTROYED"
    ) {
      return { skipped: true, reason: "event_type_ignored" };
    }

    const appointmentId = parseAppointmentIdFromFqn(payload.fqn);
    if (!appointmentId) {
      return { skipped: true, reason: "fqn_not_shg_room" };
    }

    const eventTime = new Date(payload.timestamp);

    return await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(jaas_webhook_idempotency)
        .values({ idempotencyKey: payload.idempotencyKey })
        .onConflictDoNothing()
        .returning({
          idempotencyKey: jaas_webhook_idempotency.idempotencyKey,
        });

      if (inserted.length === 0) {
        return { duplicate: true as const };
      }

      const rows = await tx
        .select()
        .from(telehealth_sessions)
        .where(eq(telehealth_sessions.appointmentId, appointmentId))
        .limit(1);

      const row = rows[0];
      if (!row) {
        return { skipped: true, reason: "telehealth_session_not_found" };
      }

      let startedAt = row.startedAt ?? null;
      let endedAt = row.endedAt ?? null;
      const jaasSessionId =
        row.jaasSessionId ?? payload.sessionId ?? null;

      if (payload.eventType === "ROOM_CREATED") {
        if (!startedAt) {
          startedAt = eventTime;
        }
      } else {
        if (!endedAt) {
          endedAt = eventTime;
        }
      }

      let durationSeconds = row.durationSeconds ?? 0;
      if (startedAt && endedAt) {
        durationSeconds = computeDurationSeconds(startedAt, endedAt);
      }

      await tx
        .update(telehealth_sessions)
        .set({
          startedAt,
          endedAt,
          durationSeconds,
          jaasSessionId: jaasSessionId ?? undefined,
        })
        .where(eq(telehealth_sessions.appointmentId, appointmentId));

      return { applied: true as const };
    });
  }
}
