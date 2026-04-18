import { Response } from "express";
import { BaseController } from "./base.controller";
import { PatientService } from "../services/patient.service";
import { patientCreateSchema } from "../validations/patient.validation";
import { catchAsync } from "../utils/catch-async";
import { AppError } from "../utils/app-error";
import { HTTP_STATUS } from "../config/constants";
import { AuthRequest } from "../middlewares/auth.middleware";
import { requireFacilityContext } from "../utils/request-context";
import {
  parseListQuery,
  patientsListQuerySchema,
} from "../utils/query-parser";

export class PatientController extends BaseController {
  constructor() {
    super();
  }

  public createPatient = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);

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

    const patientService = new PatientService(context);
    const newPatient = await patientService.createPatient(validatedData.data);

    // 3. Return response
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
    return this.ok(res, patient, "Patient retrieved successfully");
  });
}
