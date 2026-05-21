import { Response } from "express";
import { and, eq } from "drizzle-orm";
import { BaseController } from "../../core/base.controller";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { requireFacilityContext } from "../../utils/request-context";
import { catchAsync } from "../../utils/catch-async";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import { pusherAuthSchema } from "../../validations/notification.validation";
import { getRealtime } from "./notification.service";
import { db } from "../../db";
import {
  appointments,
  auscultation_sessions,
  patients,
  persons,
  users,
} from "../../db/schema";
import { RBAC_ROLES, normalizeRole } from "../../constants/rbac";

function parseChannelId(channel: string, prefix: string): string | null {
  if (!channel.startsWith(prefix)) return null;
  const id = channel.slice(prefix.length);
  return id || null;
}

async function findUserIdsForPatient(patientId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: users.id })
    .from(users)
    .innerJoin(persons, eq(persons.id, users.personId))
    .innerJoin(patients, eq(patients.personId, persons.id))
    .where(eq(patients.id, patientId));
  return rows.map((r) => r.userId);
}

export class PusherAuthController extends BaseController {
  public auth = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const body = pusherAuthSchema.safeParse(req.body);
    if (!body.success) {
      throw new AppError("Invalid Pusher auth payload", HTTP_STATUS.BAD_REQUEST);
    }
    const { socket_id: socketId, channel_name: channelName } = body.data;

    const allowed = await isAllowed(
      channelName,
      context.userId,
      context.facilityId,
      context.role,
    );
    if (!allowed) {
      throw new AppError("Forbidden", HTTP_STATUS.FORBIDDEN);
    }

    const authPayload = getRealtime().authorize(socketId, channelName);
    return res.status(HTTP_STATUS.OK).json(authPayload);
  });
}

async function isAllowed(
  channel: string,
  userId: string,
  facilityId: string,
  role: string,
): Promise<boolean> {
  if (channel === "private-admins-activity") {
    return normalizeRole(role) === RBAC_ROLES.ADMIN;
  }

  const userScoped = parseChannelId(channel, "private-user-");
  if (userScoped !== null) {
    return userScoped === userId;
  }

  const appointmentScoped = parseChannelId(channel, "private-appointment-");
  if (appointmentScoped !== null) {
    const [appt] = await db
      .select({
        doctorId: appointments.doctorId,
        patientId: appointments.patientId,
        facilityId: appointments.facilityId,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.id, appointmentScoped),
          eq(appointments.facilityId, facilityId),
        ),
      )
      .limit(1);
    if (!appt) return false;
    if (appt.doctorId === userId) return true;
    const patientUserIds = await findUserIdsForPatient(appt.patientId);
    return patientUserIds.includes(userId);
  }

  const auscultationScoped = parseChannelId(channel, "private-auscultation-");
  if (auscultationScoped !== null) {
    const [session] = await db
      .select({
        doctorId: auscultation_sessions.doctorId,
        patientId: auscultation_sessions.patientId,
        facilityId: auscultation_sessions.facilityId,
      })
      .from(auscultation_sessions)
      .where(
        and(
          eq(auscultation_sessions.id, auscultationScoped),
          eq(auscultation_sessions.facilityId, facilityId),
        ),
      )
      .limit(1);
    if (!session) return false;
    if (session.doctorId === userId) return true;
    const patientUserIds = await findUserIdsForPatient(session.patientId);
    return patientUserIds.includes(userId);
  }

  return false;
}
