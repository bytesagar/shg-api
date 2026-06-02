import { randomUUID } from "crypto";

import { db } from "../../db";
import {
  appointments,
  call_requests,
  notifications,
  rosters,
  sms_logs,
} from "../../db/schema";
import { normalizeNepaliPhone } from "../../utils/phone";
import {
  resolveUserFk,
  type MigrationContext,
  type MigrationStep,
} from "../context";
import { mapAppointmentStatus, mapService } from "../enums";
import { v1Batches, v1Query } from "../v1-client";

/**
 * Communications & scheduling — the leaf tables, run last:
 *   Appointment, SmsLog, Notification, CallRequest, Roster.
 *
 * Quirks handled here:
 *  - v2 `appointments` keeps only the lean scheduling fields; v1's telehealth
 *    cruft (callDuration, consultation_started, pregnancyId, childImmunizationId,
 *    family_planning_id) has no v2 home and is dropped. v1 `encounterId` is
 *    rewired to v2 `visitId` via the "visit" id-map (encounters were split into
 *    visit+encounter keyed by the same v1 encounter id in step 05).
 *  - v1 `SmsLog` has NO facility column, but v2 `sms_logs.facility_id` is the
 *    tenant-scope key — back-filled from the patient's v1 facility via a
 *    preloaded map (the patient is NOT NULL on every v1 SmsLog).
 *  - v1 `Notification.moduleId` is a polymorphic int; every row in the snapshot
 *    has module="appointment", so it resolves through the "appointment" id-map
 *    (other modules, if any, fall back to null).
 *  - integer status codes: Roster 1/0 -> active/inactive; Notification seen 1/0
 *    -> boolean; SmsLog status (0/1/2) is an int code preserved verbatim.
 */

function trunc(s: string | null | undefined, n: number): string | null {
  if (s == null) return null;
  const t = String(s).trim();
  if (!t) return null;
  return t.length > n ? t.slice(0, n) : t;
}

/** timestamp -> "YYYY-MM-DD" (v2 date columns are mode:"string"). */
function toDateStr(d: Date | null | undefined): string | null {
  if (d == null) return null;
  return new Date(d).toISOString().slice(0, 10);
}

interface V1Appointment {
  id: number;
  doctorId: number;
  patientId: number;
  status: string;
  date: Date | null;
  service: string | null;
  consent: number | null;
  encounterId: number | null;
  facilityId: number | null;
  createdBy: number | null;
  updatedBy: number | null;
  deletedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
}

interface V1SmsLog {
  id: number;
  patientId: number;
  scheduleDate: Date;
  deliveryDate: Date | null;
  smsBody: string | null;
  status: number;
  phone: string | null;
  createdBy: number | null;
  updatedBy: number | null;
  deletedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
}

interface V1Notification {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  seen: number;
  module: string | null;
  moduleId: number | null;
  createdBy: number | null;
  updatedBy: number | null;
  deletedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
}

interface V1CallRequest {
  id: number;
  fromUserId: number | null;
  toUserId: number | null;
  patientId: number | null;
  status: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
  deletedBy: number | null;
}

interface V1Roster {
  id: number;
  userId: number;
  facilityId: number;
  date: Date;
  fromTime: string;
  toTime: string;
  service: string;
  status: number;
  createdBy: number | null;
  updatedBy: number | null;
  deletedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
}

const CALL_STATUS: Record<string, "pending" | "accepted" | "declined" | "completed"> = {
  pending: "pending",
  accepted: "accepted",
  declined: "declined",
  completed: "completed",
};

export const commsStep: MigrationStep = {
  key: "comms",
  title: "Appointments, SMS logs, notifications, call requests, rosters",
  async run(ctx: MigrationContext): Promise<void> {
    const { idMap, report } = ctx;

    // v1 `Appointment.facilityId` and `SmsLog` (no facility column) both need
    // the tenant-scope key back-filled from the patient's v1 facility. v1
    // derived facility from the patient (`Patient.facilityId`), so preload that
    // map once and reuse for both sections below.
    const patientFacility = new Map<number, number | null>();
    for (const r of await v1Query<{ id: number; facilityId: number | null }>(
      `SELECT id, "facilityId" FROM "Patient"`,
    )) {
      patientFacility.set(Number(r.id), r.facilityId == null ? null : Number(r.facilityId));
    }

    // ---------------- APPOINTMENTS ----------------
    let total = 0;
    for await (const batch of v1Batches<V1Appointment>(
      `"Appointment"`,
      "id",
      ctx.batchSize,
      `id, "doctorId", "patientId", status, date, service, consent,
       "encounterId", "facilityId", "createdBy", "updatedBy", "deletedBy",
       "createdAt", "updatedAt", "deletedAt"`,
    )) {
      total += batch.length;
      for (const a of batch) {
        if (idMap.has("appointment", a.id)) {
          report.skipped("appointment");
          continue;
        }
        const patientId = idMap.get("patient", a.patientId);
        if (!patientId) {
          report.warn(`appointment ${a.id}: patient ${a.patientId} not mapped`);
          report.failed("appointment");
          continue;
        }
        const doctorId = resolveUserFk(ctx, "appointment", a.id, "doctorId", a.doctorId);
        // Prefer the appointment's own facility; fall back to the patient's
        // (v1 leaves Appointment.facilityId null for ~3% of rows).
        const v1FacilityId = a.facilityId ?? patientFacility.get(a.patientId) ?? null;
        const facilityId = v1FacilityId == null ? null : idMap.get("facility", v1FacilityId) ?? null;
        const visitId = idMap.get("visit", a.encounterId) ?? null;
        const createdBy =
          a.createdBy == null
            ? null
            : resolveUserFk(ctx, "appointment", a.id, "createdBy", a.createdBy);
        const updatedBy =
          a.updatedBy == null
            ? null
            : resolveUserFk(ctx, "appointment", a.id, "updatedBy", a.updatedBy);
        const deletedBy =
          a.deletedBy == null
            ? null
            : resolveUserFk(ctx, "appointment", a.id, "deletedBy", a.deletedBy);
        const date =
          toDateStr(a.date) ?? toDateStr(a.createdAt) ?? new Date().toISOString().slice(0, 10);
        const service = a.service?.trim() ? mapService(a.service) : null;

        if (ctx.dryRun) {
          mapAppointmentStatus(a.status, report);
          await idMap.set("appointment", a.id, randomUUID());
          report.inserted("appointment");
          continue;
        }

        const [row] = await db
          .insert(appointments)
          .values({
            doctorId,
            patientId,
            facilityId,
            visitId,
            date,
            status: mapAppointmentStatus(a.status, report),
            service,
            consent: a.consent ?? 1,
            createdBy,
            updatedBy,
            createdAt: a.createdAt ?? new Date(),
            updatedAt: a.updatedAt ?? null,
            deletedBy,
            deletedAt: a.deletedAt ?? null,
          })
          .returning({ id: appointments.id });
        await idMap.set("appointment", a.id, row.id);
        report.inserted("appointment");
      }
    }
    report.setV1Count("appointment", total);

    // ---------------- SMS LOGS ----------------
    // v1 SmsLog has no facility column; back-fill the tenant-scope key from the
    // patient's v1 facility (preloaded above; SmsLog.patientId is NOT NULL).
    total = 0;
    for await (const batch of v1Batches<V1SmsLog>(
      `"SmsLog"`,
      "id",
      ctx.batchSize,
      `id, "patientId", "scheduleDate", "deliveryDate", "smsBody", status, phone,
       "createdBy", "updatedBy", "deletedBy", "createdAt", "updatedAt", "deletedAt"`,
    )) {
      total += batch.length;
      for (const s of batch) {
        if (idMap.has("sms_log", s.id)) {
          report.skipped("sms_log");
          continue;
        }
        const patientId = idMap.get("patient", s.patientId);
        if (!patientId) {
          report.warn(`sms_log ${s.id}: patient ${s.patientId} not mapped`);
          report.failed("sms_log");
          continue;
        }
        const v1Facility = patientFacility.get(s.patientId) ?? null;
        const facilityId = idMap.get("facility", v1Facility) ?? null;
        const createdBy =
          s.createdBy == null
            ? null
            : resolveUserFk(ctx, "sms_log", s.id, "createdBy", s.createdBy);
        const updatedBy =
          s.updatedBy == null
            ? null
            : resolveUserFk(ctx, "sms_log", s.id, "updatedBy", s.updatedBy);
        const deletedBy =
          s.deletedBy == null
            ? null
            : resolveUserFk(ctx, "sms_log", s.id, "deletedBy", s.deletedBy);
        const phone = normalizeNepaliPhone(s.phone) ?? trunc(s.phone, 50);

        if (ctx.dryRun) {
          await idMap.set("sms_log", s.id, randomUUID());
          report.inserted("sms_log");
          continue;
        }

        const [row] = await db
          .insert(sms_logs)
          .values({
            facilityId,
            patientId,
            scheduleDate: s.scheduleDate ?? null,
            deliveryDate: s.deliveryDate ?? null,
            smsBody: s.smsBody ?? null,
            status: s.status ?? 0,
            phone,
            createdBy,
            updatedBy,
            createdAt: s.createdAt ?? new Date(),
            updatedAt: s.updatedAt ?? null,
            deletedBy,
            deletedAt: s.deletedAt ?? null,
          })
          .returning({ id: sms_logs.id });
        await idMap.set("sms_log", s.id, row.id);
        report.inserted("sms_log");
      }
    }
    report.setV1Count("sms_log", total);

    // ---------------- NOTIFICATIONS ----------------
    total = 0;
    for await (const batch of v1Batches<V1Notification>(
      `"Notification"`,
      "id",
      ctx.batchSize,
      `id, "userId", title, description, seen, module, "moduleId",
       "createdBy", "updatedBy", "deletedBy", "createdAt", "updatedAt", "deletedAt"`,
    )) {
      total += batch.length;
      for (const n of batch) {
        if (idMap.has("notification", n.id)) {
          report.skipped("notification");
          continue;
        }
        const userId = idMap.get("user", n.userId);
        if (!userId) {
          report.warn(`notification ${n.id}: user ${n.userId} not mapped`);
          report.failed("notification");
          continue;
        }
        // moduleId is polymorphic; resolve only the known "appointment" module.
        const module = trunc(n.module, 100);
        let moduleId: string | null = null;
        if (n.moduleId != null && module === "appointment") {
          moduleId = idMap.get("appointment", n.moduleId) ?? null;
        }
        const createdBy =
          n.createdBy == null
            ? null
            : resolveUserFk(ctx, "notification", n.id, "createdBy", n.createdBy);
        const updatedBy =
          n.updatedBy == null
            ? null
            : resolveUserFk(ctx, "notification", n.id, "updatedBy", n.updatedBy);
        const deletedBy =
          n.deletedBy == null
            ? null
            : resolveUserFk(ctx, "notification", n.id, "deletedBy", n.deletedBy);

        if (ctx.dryRun) {
          await idMap.set("notification", n.id, randomUUID());
          report.inserted("notification");
          continue;
        }

        const [row] = await db
          .insert(notifications)
          .values({
            userId,
            title: trunc(n.title, 500) ?? "Notification",
            description: n.description ?? null,
            seen: Number(n.seen) === 1,
            module,
            moduleId,
            createdBy,
            updatedBy,
            createdAt: n.createdAt ?? new Date(),
            updatedAt: n.updatedAt ?? null,
            deletedBy,
            deletedAt: n.deletedAt ?? null,
          })
          .returning({ id: notifications.id });
        await idMap.set("notification", n.id, row.id);
        report.inserted("notification");
      }
    }
    report.setV1Count("notification", total);

    // ---------------- CALL REQUESTS ----------------
    total = 0;
    for await (const batch of v1Batches<V1CallRequest>(
      `"CallRequest"`,
      "id",
      ctx.batchSize,
      `id, "fromUserId", "toUserId", "patientId", status,
       "createdAt", "updatedAt", "deletedAt", "deletedBy"`,
    )) {
      total += batch.length;
      for (const c of batch) {
        if (idMap.has("call_request", c.id)) {
          report.skipped("call_request");
          continue;
        }
        const fromUserId = idMap.get("user", c.fromUserId) ?? null;
        const toUserId = idMap.get("user", c.toUserId) ?? null;
        const patientId = idMap.get("patient", c.patientId) ?? null;
        const deletedBy =
          c.deletedBy == null
            ? null
            : resolveUserFk(ctx, "call_request", c.id, "deletedBy", c.deletedBy);
        const status = c.status?.trim()
          ? CALL_STATUS[c.status.trim().toLowerCase()] ?? "pending"
          : "pending";

        if (ctx.dryRun) {
          await idMap.set("call_request", c.id, randomUUID());
          report.inserted("call_request");
          continue;
        }

        const [row] = await db
          .insert(call_requests)
          .values({
            fromUserId,
            toUserId,
            patientId,
            status,
            createdAt: c.createdAt ?? new Date(),
            updatedAt: c.updatedAt ?? null,
            deletedBy,
            deletedAt: c.deletedAt ?? null,
          })
          .returning({ id: call_requests.id });
        await idMap.set("call_request", c.id, row.id);
        report.inserted("call_request");
      }
    }
    report.setV1Count("call_request", total);

    // ---------------- ROSTERS ----------------
    total = 0;
    for await (const batch of v1Batches<V1Roster>(
      `"Roster"`,
      "id",
      ctx.batchSize,
      `id, "userId", "facilityId", date, "fromTime", "toTime", service, status,
       "createdBy", "updatedBy", "deletedBy", "createdAt", "updatedAt", "deletedAt"`,
    )) {
      total += batch.length;
      for (const r of batch) {
        if (idMap.has("roster", r.id)) {
          report.skipped("roster");
          continue;
        }
        const userId = idMap.get("user", r.userId);
        const facilityId = idMap.get("facility", r.facilityId);
        if (!userId || !facilityId) {
          report.warn(
            `roster ${r.id}: user ${r.userId}/facility ${r.facilityId} not mapped`,
          );
          report.failed("roster");
          continue;
        }
        const createdBy =
          r.createdBy == null
            ? null
            : resolveUserFk(ctx, "roster", r.id, "createdBy", r.createdBy);
        const updatedBy =
          r.updatedBy == null
            ? null
            : resolveUserFk(ctx, "roster", r.id, "updatedBy", r.updatedBy);
        const deletedBy =
          r.deletedBy == null
            ? null
            : resolveUserFk(ctx, "roster", r.id, "deletedBy", r.deletedBy);

        if (ctx.dryRun) {
          await idMap.set("roster", r.id, randomUUID());
          report.inserted("roster");
          continue;
        }

        const [row] = await db
          .insert(rosters)
          .values({
            userId,
            facilityId,
            date: toDateStr(r.date) ?? new Date().toISOString().slice(0, 10),
            fromTime: trunc(r.fromTime, 50) ?? "",
            toTime: trunc(r.toTime, 50) ?? "",
            service: trunc(r.service, 255) ?? "opd",
            status: Number(r.status) === 1 ? "active" : "inactive",
            createdBy,
            updatedBy,
            createdAt: r.createdAt ?? new Date(),
            updatedAt: r.updatedAt ?? null,
            deletedBy,
            deletedAt: r.deletedAt ?? null,
          })
          .returning({ id: rosters.id });
        await idMap.set("roster", r.id, row.id);
        report.inserted("roster");
      }
    }
    report.setV1Count("roster", total);
  },
};
