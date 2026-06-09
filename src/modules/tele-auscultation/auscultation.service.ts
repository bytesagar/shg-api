import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { FacilityContext } from "../../context/facility-context";
import { isDoctor } from "../../constants/rbac";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import { db } from "../../db";
import { patients, persons, users } from "../../db/schema";
import { PatientRepository } from "../patients/patient.repository";
import { UserRepository } from "../users/user.repository";
import { JitsiJaasService } from "../webhooks/jitsi-jass/jitsi-jaas.service";
import { NotificationService } from "../notifications/notification.service";
import { AuscultationRepository } from "./auscultation.repository";
import { logger } from "../../utils/logger";
import type {
  AuscultationListQuery,
  AuscultationStartInput,
} from "../../validations/tele-auscultation.validation";

export class AuscultationService {
  private readonly repo: AuscultationRepository;
  private readonly patientRepo: PatientRepository;
  private readonly userRepo: UserRepository;
  private readonly jitsi = new JitsiJaasService();
  private readonly notifications: NotificationService;

  constructor(private readonly context: FacilityContext) {
    this.repo = new AuscultationRepository(context);
    this.patientRepo = new PatientRepository(context);
    this.userRepo = new UserRepository(context);
    this.notifications = new NotificationService(context.userId);
  }

  public async startSession(input: AuscultationStartInput) {
    const doctor = await this.userRepo.findById(this.context.userId);
    if (!doctor || !isDoctor(doctor.role?.name)) {
      throw new AppError(
        "Only doctors can start a tele-auscultation session",
        HTTP_STATUS.FORBIDDEN,
      );
    }

    const patient = await this.patientRepo.findById(input.patientId);
    if (!patient) {
      throw new AppError("Patient not found", HTTP_STATUS.NOT_FOUND);
    }

    const id = randomUUID();
    const roomName = `shg-aus-${id}`;

    const session = await this.repo.create({
      id,
      patientId: patient.id,
      doctorId: doctor.id,
      encounterId: input.encounterId ?? null,
      visitId: input.visitId ?? null,
      appointmentId: input.appointmentId ?? null,
      roomName,
    });
    if (!session) {
      throw new AppError(
        "Unable to create auscultation session",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
      );
    }

    const meetingUrl = this.jitsi.buildMeetingUrl(roomName);
    if (!meetingUrl) {
      throw new AppError(
        "JaaS is not configured",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
      );
    }

    const doctorName =
      `${doctor.firstName ?? ""} ${doctor.lastName ?? ""}`.trim() || "Doctor";
    const patientName =
      `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() ||
      patient.name ||
      "Patient";

    const doctorToken = this.jitsi.createJoinToken(roomName, {
      id: doctor.id,
      name: doctorName,
      email: doctor.email ?? "",
      moderator: true,
    });

    const patientUserIds = await this.findUserIdsForPatient(patient.id);
    const patientToken = this.jitsi.createJoinToken(roomName, {
      id: patientUserIds[0] ?? patient.id,
      name: patientName,
      email: "",
      moderator: false,
    });

    const audioOnlySuffix =
      "#config.startAudioOnly=true&config.disableVideo=true&config.startWithVideoMuted=true";
    const doctorJoinUrl = doctorToken
      ? `${meetingUrl}?jwt=${doctorToken}${audioOnlySuffix}`
      : `${meetingUrl}${audioOnlySuffix}`;
    const patientJoinUrl = patientToken
      ? `${meetingUrl}?jwt=${patientToken}${audioOnlySuffix}`
      : `${meetingUrl}${audioOnlySuffix}`;

    logger.audit("auscultation.session.started", {
      sessionId: session.id,
      doctorId: doctor.id,
      patientId: patient.id,
      facilityId: this.context.facilityId,
    });

    await this.notifications.publish({
      kind: "auscultation.session.started",
      recipientUserIds: patientUserIds,
      data: {
        sessionId: session.id,
        doctorName,
        patientName,
        joinUrl: patientJoinUrl,
        moduleId: session.id,
      },
    });

    return {
      session,
      doctor: {
        joinUrl: doctorJoinUrl,
        room: roomName,
      },
      patient: {
        joinUrl: patientJoinUrl,
        userIds: patientUserIds,
      },
    };
  }

  public async getJoinLink(params: {
    sessionId: string;
    as: "doctor" | "patient";
  }) {
    const session = await this.repo.findById(params.sessionId);
    if (!session) {
      throw new AppError(
        "Auscultation session not found",
        HTTP_STATUS.NOT_FOUND,
      );
    }
    const meetingUrl = this.jitsi.buildMeetingUrl(session.roomName);
    if (!meetingUrl) {
      throw new AppError("JaaS is not configured", HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
    const audioOnlySuffix =
      "#config.startAudioOnly=true&config.disableVideo=true&config.startWithVideoMuted=true";

    if (params.as === "doctor") {
      const doctor = await this.userRepo.findById(session.doctorId);
      if (!doctor) {
        throw new AppError("Doctor not found", HTTP_STATUS.NOT_FOUND);
      }
      const doctorName =
        `${doctor.firstName ?? ""} ${doctor.lastName ?? ""}`.trim() || "Doctor";
      const token = this.jitsi.createJoinToken(session.roomName, {
        id: doctor.id,
        name: doctorName,
        email: doctor.email ?? "",
        moderator: true,
      });
      return {
        joinUrl: token
          ? `${meetingUrl}?jwt=${token}${audioOnlySuffix}`
          : `${meetingUrl}${audioOnlySuffix}`,
        room: session.roomName,
      };
    }

    const patient = await this.patientRepo.findById(session.patientId);
    if (!patient) {
      throw new AppError("Patient not found", HTTP_STATUS.NOT_FOUND);
    }
    const patientName =
      `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() ||
      patient.name ||
      "Patient";
    const token = this.jitsi.createJoinToken(session.roomName, {
      id: this.context.userId,
      name: patientName,
      email: "",
      moderator: false,
    });
    return {
      joinUrl: token
        ? `${meetingUrl}?jwt=${token}${audioOnlySuffix}`
        : `${meetingUrl}${audioOnlySuffix}`,
      room: session.roomName,
    };
  }

  public async stopSession(sessionId: string) {
    const session = await this.repo.findById(sessionId);
    if (!session) {
      throw new AppError(
        "Auscultation session not found",
        HTTP_STATUS.NOT_FOUND,
      );
    }
    const endedAt = new Date();
    const startedAt = session.startedAt ?? session.createdAt;
    const durationSeconds = startedAt
      ? Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000))
      : 0;
    const updated = await this.repo.markEnded(sessionId, endedAt, durationSeconds);
    if (!updated) {
      throw new AppError("Unable to end session", HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    logger.info("auscultation.session.ended", {
      sessionId,
      durationSeconds,
    });

    await this.notifications.publish({
      kind: "auscultation.session.ended",
      recipientUserIds: [],
      data: {
        sessionId,
        durationSeconds,
        moduleId: sessionId,
      },
    });

    return updated;
  }

  public async attachRecording(sessionId: string, attachmentId: string) {
    const session = await this.repo.findById(sessionId);
    if (!session) {
      throw new AppError(
        "Auscultation session not found",
        HTTP_STATUS.NOT_FOUND,
      );
    }
    const updated = await this.repo.attachRecording(sessionId, attachmentId);
    if (!updated) {
      throw new AppError(
        "Unable to attach recording",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
      );
    }
    logger.audit("auscultation.recording.attached", {
      sessionId,
      attachmentId,
      doctorId: session.doctorId,
      patientId: session.patientId,
    });

    await this.notifications.publish({
      kind: "auscultation.recording.ready",
      recipientUserIds: [session.doctorId],
      data: {
        sessionId,
        attachmentId,
        moduleId: sessionId,
      },
    });
    return updated;
  }

  public async getById(sessionId: string) {
    const session = await this.repo.findById(sessionId);
    if (!session) {
      throw new AppError(
        "Auscultation session not found",
        HTTP_STATUS.NOT_FOUND,
      );
    }
    return session;
  }

  public async list(query: AuscultationListQuery) {
    const { items, total } = await this.repo.list({
      patientId: query.patientId,
      encounterId: query.encounterId,
      visitId: query.visitId,
      page: query.page,
      pageSize: query.pageSize,
    });
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  private async findUserIdsForPatient(patientId: string): Promise<string[]> {
    const rows = await db
      .select({ userId: users.id })
      .from(users)
      .innerJoin(persons, eq(persons.id, users.personId))
      .innerJoin(patients, eq(patients.personId, persons.id))
      .where(eq(patients.id, patientId));
    return rows.map((r) => r.userId);
  }
}
