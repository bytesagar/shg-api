import { randomUUID } from "crypto";
import { FacilityContext } from "../../context/facility-context";
import { AppointmentRepository } from "./appointment.repository";
import { PatientRepository } from "../patients/patient.repository";
import { UserRepository } from "../users/user.repository";
import { TelehealthAppointmentCreateInput } from "../../validations/telehealth.validation";
import { JitsiJaasService } from "../webhooks/jitsi-jass/jitsi-jaas.service";
import { EmailService } from "../email/email.service";
import { db } from "../../db";
import { telehealth_sessions } from "../../db/schema";
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
  private email: EmailService;

  constructor(private readonly context: FacilityContext) {
    this.appointmentRepository = new AppointmentRepository(context);
    this.patientRepository = new PatientRepository(context);
    this.userRepository = new UserRepository(context);
    this.jitsi = new JitsiJaasService();
    this.email = new EmailService();
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
      return { error: "TELEHEALTH_DOCTOR_DAY_TAKEN" as const };
    }
    if (dayConflict === "PATIENT_DAY_TAKEN") {
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

    let emailSent = false;
    let emailError: string | undefined = undefined;
    if (doctor.email) {
      const result = await this.email.send({
        to: doctor.email,
        subject: "New telehealth appointment booked",
        body: `A telehealth appointment has been booked.\n\nPatient: ${patientName}\nScheduled At: ${input.scheduledAt.toISOString()}\n\nTo join the video call, open this appointment in the app and use the Join button (a secure link is generated when you join).\n`,
      });
      emailSent = result.success;
      emailError = result.error;
    }

    return {
      appointment,
      meeting: {
        provider: "jitsi_jaas" as const,
        room: session.roomName,
      },
      emailSent,
      emailError,
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
    return {
      meeting: {
        provider: "jitsi_jaas" as const,
        room,
        url: meetingUrl,
        joinUrl,
      },
    };
  }
}
