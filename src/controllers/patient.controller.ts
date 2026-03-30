import { Request, Response } from "express";
import { BaseController } from "./base.controller";
import { PatientService } from "../services/patient.service";
import { patientCreateSchema } from "../validations/patient.validation";
import { catchAsync } from "../utils/catch-async";
import { AppError } from "../utils/app-error";
import { HTTP_STATUS } from "../config/constants";
import { AuthRequest } from "../middlewares/auth.middleware";

export class PatientController extends BaseController {
  private patientService: PatientService;

  constructor() {
    super();
    this.patientService = new PatientService();
  }

  public createPatient = catchAsync(async (req: AuthRequest, res: Response) => {
    // 1. Validate request body with Zod
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

    // 2. Call service for creation
    const loggedInUserId = req.user!.id;
    const newPatient = await this.patientService.createPatient(
      validatedData.data,
      loggedInUserId,
    );

    // 3. Return response
    return this.created(res, newPatient, "Patient registered successfully");
  });

  public getPatients = catchAsync(async (req: Request, res: Response) => {
    const patients = await this.patientService.getAllPatients();
    return this.ok(res, patients, "Patients retrieved successfully");
  });

  public getPatient = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const patient = await this.patientService.getPatientById(id as string);
    if (!patient) {
      throw new AppError("Patient not found", HTTP_STATUS.NOT_FOUND);
    }
    return this.ok(res, patient, "Patient retrieved successfully");
  });
}
