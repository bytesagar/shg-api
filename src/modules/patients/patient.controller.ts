import { Response } from "express";
import { BaseController } from "../../core/base.controller";
import { PatientService } from "./patient.service";
import {
  patientCreateSchema,
  patientFamilyPlanningProfileSchema,
} from "../../validations/patient.validation";
import { catchAsync } from "../../utils/catch-async";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { requireFacilityContext } from "../../utils/request-context";
import {
  parseListQuery,
  patientsListQuerySchema,
} from "../../utils/query-parser";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export class PatientController extends BaseController {

  constructor() {
    super();
  }

  public createPatient = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);

    const validatedData = patientCreateSchema.safeParse(req.body);

    if (!validatedData.success) {
      const errorMessages = validatedData.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      throw new AppError(
        `Validation failed: ${errorMessages}`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const patientService = new PatientService(context);
    const newPatient = await patientService.createPatient(validatedData.data);

    return this.created(res, newPatient, "Patient registered successfully");
  });

  public getPatients = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);

    const query = parseListQuery(req.query, patientsListQuerySchema);
    const patientService = new PatientService(context);
    const result = await patientService.getAllPatients(query);
    return this.ok(res, result, "Patients retrieved successfully");
  });

  public getPatient = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);

    const { id } = req.params;
    const patientService = new PatientService(context);
    const patient = await patientService.getPatientById(id as string);
    if (!patient) {
      throw new AppError("Patient not found", HTTP_STATUS.NOT_FOUND);
    }

    const summary = await db.execute<{
      activeVisitId: string | null;
      activeVisitDate: Date | null;
      activeVisitReason: string | null;
      activeVisitService: string | null;
      activeVisitStatus: string | null;
      activeVisitDoctorId: string | null;
      upcomingAppointmentId: string | null;
      upcomingAppointmentDate: Date | null;
      upcomingAppointmentStatus: string | null;
      upcomingAppointmentDoctorId: string | null;
      upcomingAppointmentDoctorFirstName: string | null;
      upcomingAppointmentDoctorLastName: string | null;
      upcomingAppointmentDoctorPhoneNumber: string | null;
      upcomingAppointmentDoctorDesignation: string | null;
      upcomingAppointmentService: string | null;
    }>(sql`
      select
        v.id as "activeVisitId",
        v.date as "activeVisitDate",
        v.reason as "activeVisitReason",
        v.service as "activeVisitService",
        v.status as "activeVisitStatus",
        v.doctor_id as "activeVisitDoctorId",
        a.id as "upcomingAppointmentId",
        a.date as "upcomingAppointmentDate",
        a.status as "upcomingAppointmentStatus",
        a.doctor_id as "upcomingAppointmentDoctorId",
        a.doctor_first_name as "upcomingAppointmentDoctorFirstName",
        a.doctor_last_name as "upcomingAppointmentDoctorLastName",
        a.doctor_phone_number as "upcomingAppointmentDoctorPhoneNumber",
        a.doctor_designation as "upcomingAppointmentDoctorDesignation",
        a.service as "upcomingAppointmentService"
      from (
        select ${patient.id}::uuid as patient_id, ${context.facilityId}::uuid as facility_id
      ) p
      left join lateral (
        select id, date, reason, service, status, doctor_id
        from visits
        where patient_id = p.patient_id
          and facility_id = p.facility_id
          and status in ('planned', 'arrived', 'in_progress')
          and deleted_at is null
        order by date desc
        limit 1
      ) v on true
      left join lateral (
        select
          ap.id,
          ap.date,
          ap.status,
          ap.doctor_id,
          ap.service,
          u.first_name as doctor_first_name,
          u.last_name as doctor_last_name,
          u.phone_number as doctor_phone_number,
          u.designation as doctor_designation
        from appointments ap
        left join users u on u.id = ap.doctor_id and u.deleted_at is null
        where ap.patient_id = p.patient_id
          and ap.facility_id = p.facility_id
          and ap.status in ('scheduled', 'confirmed')
          and ap.date >= now()
          and ap.deleted_at is null
        order by ap.date asc
        limit 1
      ) a on true
    `);

    const row = summary.rows[0];

    const activeVisit = row?.activeVisitId
      ? {
          id: row.activeVisitId,
          date: row.activeVisitDate,
          reason: row.activeVisitReason,
          service: row.activeVisitService,
          status: row.activeVisitStatus,
          doctorId: row.activeVisitDoctorId,
        }
      : null;

    const upcomingAppointment = row?.upcomingAppointmentId
      ? {
          id: row.upcomingAppointmentId,
          date: row.upcomingAppointmentDate,
          status: row.upcomingAppointmentStatus,
          doctorId: row.upcomingAppointmentDoctorId,
          doctor: row.upcomingAppointmentDoctorId
            ? {
                id: row.upcomingAppointmentDoctorId,
                firstName: row.upcomingAppointmentDoctorFirstName,
                lastName: row.upcomingAppointmentDoctorLastName,
                phoneNumber: row.upcomingAppointmentDoctorPhoneNumber,
                designation: row.upcomingAppointmentDoctorDesignation,
                name: [
                  row.upcomingAppointmentDoctorFirstName,
                  row.upcomingAppointmentDoctorLastName,
                ]
                  .filter(Boolean)
                  .join(" "),
              }
            : null,
          service: row.upcomingAppointmentService,
        }
      : null;

    const responseData = {
      ...patient,
      activeVisit,
      upcomingAppointment,
    };
    return this.ok(res, responseData, "Patient retrieved successfully");
  });

  public updateFamilyPlanningProfile = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const { id } = req.params as { id: string };

      const validatedData = patientFamilyPlanningProfileSchema.safeParse(req.body);
      if (!validatedData.success) {
        const errorMessages = validatedData.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new AppError(
          `Validation failed: ${errorMessages}`,
          HTTP_STATUS.BAD_REQUEST,
        );
      }

      const patientService = new PatientService(context);
      const updated = await patientService.updateFamilyPlanningProfile(
        id,
        validatedData.data,
      );
      if (!updated) {
        throw new AppError("Patient not found", HTTP_STATUS.NOT_FOUND);
      }

      return this.ok(
        res,
        updated,
        "Patient family planning profile updated successfully",
      );
    },
  );
}
