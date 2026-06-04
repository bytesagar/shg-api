import { db } from "../../db";
import { telehealth_sessions } from "../../db/schema";
import { type MigrationContext, type MigrationStep } from "../context";
import { v1Batches } from "../v1-client";

/**
 * Backfill `telehealth_sessions` for migrated appointments that carried a real
 * v1 telehealth call.
 *
 * Why this is needed: the comms step (10) migrates only the lean `appointments`
 * scheduling row and intentionally drops v1's telehealth fields, because v2 has
 * no equivalent *source* table — v1 crammed call state (`callDuration`,
 * `consultation_started`) straight onto the `Appointment` row. As a result the
 * doctors-appointment-summary report's `consultationDurationSeconds` column
 * (SUM of `telehealth_sessions.duration_seconds`) reads 0 for all historical
 * appointments. `totalAssigned` / `totalConsultation` are unaffected — they read
 * the migrated appointment rows directly.
 *
 * What this step does: for every v1 appointment with `callDuration > 0`, create
 * the one `telehealth_sessions` row the live code would have created lazily on
 * first join, so the analytics SUM has something to add up:
 *   - roomName       = shg-{v2AppointmentId}  (the deterministic name the
 *                      telehealth service / webhook handler use — see
 *                      JitsiJaasService.buildRoomName)
 *   - provider       = "jitsi_jaas"
 *   - durationSeconds= callDuration * 60. v1 `callDuration` is recorded in
 *                      MINUTES (snapshot range 0..54, avg ~4); v2 stores seconds.
 *   - startedAt      = consultation_started (only ~1/4 of rows carry it)
 *   - endedAt        = startedAt + duration (only where startedAt exists, so the
 *                      time-bucketed consultations report can pick it up too);
 *                      null otherwise — we never fabricate a timestamp.
 *
 * Idempotent: `telehealth_sessions.appointment_id` is UNIQUE, so inserts use
 * onConflictDoNothing and a re-run (or an appointment whose session the live app
 * already created) is counted as skipped, not duplicated. No id-map entry is
 * needed — the row is keyed by the already-mapped appointment id.
 */
const CALL_DURATION_UNIT_SECONDS = 60; // v1 callDuration is minutes -> seconds

interface V1CallAppointment {
  id: number;
  callDuration: number | null;
  consultation_started: Date | string | null;
}

function toDate(v: Date | string | null): Date | null {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const backfillTelehealthSessionsStep: MigrationStep = {
  key: "backfill-telehealth-sessions",
  title: "Backfill telehealth_sessions from v1 call durations",
  async run(ctx: MigrationContext): Promise<void> {
    const { idMap, report } = ctx;

    let total = 0;
    for await (const batch of v1Batches<V1CallAppointment>(
      `"Appointment"`,
      "id",
      ctx.batchSize,
      `id, "callDuration", consultation_started`,
      // Only rows that represent a real call. NULL/0 durations are no-ops.
      `"callDuration" > 0`,
    )) {
      total += batch.length;
      for (const a of batch) {
        const v2AppointmentId = idMap.get("appointment", a.id);
        if (!v2AppointmentId) {
          // The appointment itself wasn't migrated (e.g. its patient never
          // mapped in step 04). Nothing to attach a session to.
          report.warn(
            `telehealth_session: appointment ${a.id} not mapped — skipped`,
          );
          report.skipped("telehealth_session");
          continue;
        }

        const durationSeconds =
          (a.callDuration ?? 0) * CALL_DURATION_UNIT_SECONDS;
        const startedAt = toDate(a.consultation_started);
        const endedAt = startedAt
          ? new Date(startedAt.getTime() + durationSeconds * 1000)
          : null;

        if (ctx.dryRun) {
          report.inserted("telehealth_session");
          continue;
        }

        const inserted = await db
          .insert(telehealth_sessions)
          .values({
            appointmentId: v2AppointmentId,
            provider: "jitsi_jaas",
            roomName: `shg-${v2AppointmentId}`,
            startedAt,
            endedAt,
            durationSeconds,
          })
          .onConflictDoNothing({ target: telehealth_sessions.appointmentId })
          .returning({ id: telehealth_sessions.id });

        if (inserted.length) report.inserted("telehealth_session");
        else report.skipped("telehealth_session");
      }
    }
    report.setV1Count("telehealth_session", total);
  },
};
