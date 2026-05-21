import { randomUUID } from "crypto";
import { FacilityContext } from "../../context/facility-context";
import { AppointmentRepository } from "./appointment.repository";
import { PatientRepository } from "../patients/patient.repository";
import { UserRepository } from "../users/user.repository";
import {
  TelehealthAppointmentCreateInput,
  TelehealthAppointmentsListQuery,
} from "../../validations/telehealth.validation";
import { JitsiJaasService } from "../webhooks/jitsi-jass/jitsi-jaas.service";
import { NotificationService } from "../notifications/notification.service";
import { logger } from "../../utils/logger";
import { db } from "../../db";
import {
  patients,
  persons,
  telehealth_sessions,
  users,
} from "../../db/schema";
import { eq } from "drizzle-orm";
import {
  RosterService,
  TELEHEALTH_ROSTER_SERVICE,
} from "../rosters/roster.service";

export class TelehealthService {
  private appointmentRepository: AppointmentRepository;
  private patientRepository: PatientRepository;
  private userRepository: UserRepository;
  private jitsi: JitsiJaasService;
  private notifications: NotificationService;

  constructor(private readonly context: FacilityContext) {
    this.appointmentRepository = new AppointmentRepository(context);
    this.patientRepository = new PatientRepository(context);
    this.userRepository = new UserRepository(context);
    this.jitsi = new JitsiJaasService();
    this.notifications = new NotificationService(context.userId);
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

  public async listAppointments(query: TelehealthAppointmentsListQuery) {
    let fromDate = query.fromDate;
    let toDate = query.toDate;
    if (query.date) {
      fromDate = query.date;
      const next = new Date(`${query.date}T00:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      toDate = next.toISOString().slice(0, 10);
    }

    return this.appointmentRepository.findMany({
      patientId: query.patientId,
      doctorId: query.assignedDoctorId ?? query.doctorId,
      status: query.status,
      fromDate,
      toDate,
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
    });
  }

  public async bookTelehealthAppointment(
    input: TelehealthAppointmentCreateInput,
  ) {
    const patient = await this.patientRepository.findById(input.patientId);
    if (!patient) return { error: "PATIENT_NOT_FOUND" as const };

    const doctor = await this.userRepository.findById(input.doctorId);
    if (!doctor) return { error: "DOCTOR_NOT_FOUND" as const };
    if (doctor.userType !== "doctor")
      return { error: "DOCTOR_NOT_FOUND" as const };

    const dayConflict =
      await this.appointmentRepository.findTelehealthDayConflict({
        doctorId: doctor.id,
        patientId: patient.id,
        scheduledAt: input.scheduledAt,
      });
    if (dayConflict === "DOCTOR_DAY_TAKEN") {
      logger.warn("telehealth.booking.conflict", {
        reason: "doctor_day_taken",
        doctorId: doctor.id,
        scheduledAt: input.scheduledAt,
      });
      return { error: "TELEHEALTH_DOCTOR_DAY_TAKEN" as const };
    }
    if (dayConflict === "PATIENT_DAY_TAKEN") {
      logger.warn("telehealth.booking.conflict", {
        reason: "patient_day_taken",
        patientId: patient.id,
        scheduledAt: input.scheduledAt,
      });
      return { error: "TELEHEALTH_PATIENT_DAY_TAKEN" as const };
    }

    // const rosterService = new RosterService(this.context);
    // const onRoster = await rosterService.isUserOnRosterForBooking({
    //   userId: doctor.id,
    //   scheduledAt: input.scheduledAt,
    //   service: TELEHEALTH_ROSTER_SERVICE,
    // });
    // if (!onRoster) {
    //   return { error: "PROVIDER_NOT_ON_ROSTER" as const };
    // }

    const appointmentId = randomUUID();
    const room = this.jitsi.buildRoomName(appointmentId);

    const doctorName = `${doctor.firstName} ${doctor.lastName}`.trim();
    const patientName =
      `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() ||
      patient.name ||
      "Patient";

    const appointment = await this.appointmentRepository.create({
      id: appointmentId,
      doctorId: doctor.id,
      patientId: patient.id,
      date: input.scheduledAt,
      facilityId: this.context.facilityId,
      status: "scheduled",
      service: "telehealth",
      createdBy: this.context.userId,
      updatedBy: this.context.userId,
    });

    const session = (
      await db
        .insert(telehealth_sessions)
        .values({
          appointmentId: appointment.id,
          provider: "jitsi_jaas",
          roomName: room,
        })
        .returning()
    )[0];

    const patientUserIds = await this.findUserIdsForPatient(patient.id);
    const recipientUserIds = Array.from(
      new Set([doctor.id, ...patientUserIds]),
    );

    logger.audit("telehealth.appointment.booked", {
      appointmentId: appointment.id,
      doctorId: doctor.id,
      patientId: patient.id,
      scheduledAt: input.scheduledAt,
      facilityId: this.context.facilityId,
    });

    await this.notifications.publish({
      kind: "telehealth.appointment.booked",
      recipientUserIds,
      data: {
        appointmentId: appointment.id,
        doctorUserId: doctor.id,
        patientUserId: patientUserIds[0] ?? null,
        doctorName,
        patientName,
        scheduledAt: input.scheduledAt,
        moduleId: appointment.id,
      },
    });

    return {
      appointment,
      meeting: {
        provider: "jitsi_jaas" as const,
        room: session.roomName,
      },
    };
  }

  public async getJoinLink(params: {
    appointmentId: string;
    as: "doctor" | "patient";
  }) {
    const appt = await this.appointmentRepository.findById(
      params.appointmentId,
    );
    if (!appt) return { error: "APPOINTMENT_NOT_FOUND" as const };

    if (appt.service !== "telehealth") {
      return { error: "MEETING_URL_NOT_AVAILABLE" as const };
    }

    const sessionResult = await db
      .select()
      .from(telehealth_sessions)
      .where(eq(telehealth_sessions.appointmentId, appt.id))
      .limit(1);

    let session = sessionResult[0];
    if (!session) {
      const roomName = this.jitsi.buildRoomName(appt.id);
      session = (
        await db
          .insert(telehealth_sessions)
          .values({
            appointmentId: appt.id,
            provider: "jitsi_jaas",
            roomName: roomName,
          })
          .returning()
      )[0];
    }

    if (!session?.roomName) {
      return { error: "MEETING_URL_NOT_AVAILABLE" as const };
    }

    const room = session.roomName;
    const meetingUrl = this.jitsi.buildMeetingUrl(room);
    if (!meetingUrl) {
      return { error: "MEETING_URL_NOT_AVAILABLE" as const };
    }

    let token: string | null = null;
    if (params.as === "doctor") {
      const doctor = await this.userRepository.findById(appt.doctorId);
      if (!doctor) return { error: "DOCTOR_NOT_FOUND" as const };
      const doctorName =
        `${doctor.firstName} ${doctor.lastName}`.trim() || "Doctor";
      token = this.jitsi.createJoinToken(room, {
        id: doctor.id,
        name: doctorName,
        email: doctor.email ?? "",
        moderator: true,
      });
    } else {
      const patient = await this.patientRepository.findById(appt.patientId);
      if (!patient) return { error: "PATIENT_NOT_FOUND" as const };
      const patientName =
        `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() ||
        patient.name ||
        "Patient";
      token = this.jitsi.createJoinToken(room, {
        id: this.context.userId,
        name: patientName,
        email: "",
        moderator: false,
      });
    }

    const joinUrl = token ? `${meetingUrl}?jwt=${token}` : meetingUrl;
    logger.info("telehealth.join_link.minted", {
      appointmentId: appt.id,
      as: params.as,
      room,
    });
    return {
      meeting: {
        provider: "jitsi_jaas" as const,
        room,
        url: meetingUrl,
        joinUrl,
      },
    };
  }

  public async updateSessionDuration(params: {
    appointmentId: string;
    durationSeconds: number;
    startedAt: Date | null;
    endedAt: Date | null;
  }) {
    const appt = await this.appointmentRepository.findById(
      params.appointmentId,
    );
    if (!appt) return { error: "APPOINTMENT_NOT_FOUND" as const };
    if (appt.service !== "telehealth")
      return { error: "NOT_TELEHEALTH" as const };

    const result = await db.transaction(async (tx) => {
      const sessionResult = await tx
        .select()
        .from(telehealth_sessions)
        .where(eq(telehealth_sessions.appointmentId, appt.id))
        .limit(1);

      const session = sessionResult[0];
      if (!session) {
        const inserted = (
          await tx
            .insert(telehealth_sessions)
            .values({
              startedAt: params.startedAt ?? null,
              endedAt: params.endedAt ?? null,
              appointmentId: appt.id,
              provider: "manual",
              durationSeconds: params.durationSeconds,
            })
            .returning()
        )[0];

        if (!inserted) return { error: "SESSION_NOT_FOUND" as const };
        return { session: inserted };
      }

      const updated = (
        await tx
          .update(telehealth_sessions)
          .set({
            durationSeconds: params.durationSeconds,
            startedAt: params.startedAt ?? undefined,
            endedAt: params.endedAt ?? undefined,
          })
          .where(eq(telehealth_sessions.id, session.id))
          .returning()
      )[0];

      if (!updated) return { error: "SESSION_NOT_FOUND" as const };
      return { session: updated };
    });

    if ("session" in result && params.endedAt) {
      logger.info("telehealth.session.ended", {
        appointmentId: appt.id,
        durationSeconds: params.durationSeconds,
      });
      await this.notifications.publish({
        kind: "telehealth.session.ended",
        recipientUserIds: [],
        data: {
          appointmentId: appt.id,
          durationSeconds: params.durationSeconds,
          moduleId: appt.id,
        },
      });
    }

    return result;
  }
}
