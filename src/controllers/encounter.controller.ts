import { Response } from "express";
import { BaseController } from "./base.controller";
import { catchAsync } from "../utils/catch-async";
import { AppError } from "../utils/app-error";
import { HTTP_STATUS } from "../config/constants";
import { AuthRequest } from "../middlewares/auth.middleware";
import {
  complaintCreateSchema,
  confirmDiagnosisCreateSchema,
  documentCreateSchema,
  encounterCreateSchema,
  historyCreateSchema,
  medicationCreateSchema,
  physicalExaminationCreateSchema,
  provisionalDiagnosisCreateSchema,
  testCreateSchema,
  treatmentCreateSchema,
  vitalsCreateSchema,
} from "../validations/encounter.validation";
import { EncounterService } from "../services/encounter.service";
import { EncounterRecordService } from "../services/encounter-record.service";
import { requireFacilityContext } from "../utils/request-context";

export class EncounterController extends BaseController {
  public createEncounter = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);

      const validatedData = encounterCreateSchema.safeParse(req.body);
      if (!validatedData.success) {
        const errorMessages = validatedData.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new AppError(
          `Validation failed: ${errorMessages}`,
          HTTP_STATUS.BAD_REQUEST,
        );
      }

      const encounterService = new EncounterService(context);
      const encounter = await encounterService.createEncounter(
        validatedData.data,
      );
      if (!encounter) {
        throw new AppError("Patient not found", HTTP_STATUS.NOT_FOUND);
      }

      return this.created(res, encounter, "Encounter created successfully");
    },
  );

  public getEncounter = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);

    const { id } = req.params;
    const encounterService = new EncounterService(context);
    const encounter = await encounterService.getEncounterById(id as string);
    if (!encounter) {
      throw new AppError("Encounter not found", HTTP_STATUS.NOT_FOUND);
    }
    return this.ok(res, encounter, "Encounter retrieved successfully");
  });

  public addVitals = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const validatedData = vitalsCreateSchema.safeParse(req.body);
    if (!validatedData.success) {
      const errorMessages = validatedData.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      throw new AppError(
        `Validation failed: ${errorMessages}`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const { id } = req.params;
    const recordService = new EncounterRecordService(context);
    const record = await recordService.addVitals(
      id as string,
      validatedData.data,
    );
    if (!record) {
      throw new AppError("Encounter not found", HTTP_STATUS.NOT_FOUND);
    }
    return this.created(res, record, "Vitals recorded successfully");
  });

  public addHistory = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const validatedData = historyCreateSchema.safeParse(req.body);
    if (!validatedData.success) {
      const errorMessages = validatedData.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      throw new AppError(
        `Validation failed: ${errorMessages}`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const { id } = req.params;
    const recordService = new EncounterRecordService(context);
    const record = await recordService.addHistory(
      id as string,
      validatedData.data,
    );
    if (!record) {
      throw new AppError("Encounter not found", HTTP_STATUS.NOT_FOUND);
    }
    return this.created(res, record, "History recorded successfully");
  });

  public addComplaint = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const validatedData = complaintCreateSchema.safeParse(req.body);
    if (!validatedData.success) {
      const errorMessages = validatedData.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      throw new AppError(
        `Validation failed: ${errorMessages}`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const { id } = req.params;
    const recordService = new EncounterRecordService(context);
    const record = await recordService.addComplaint(
      id as string,
      validatedData.data,
    );
    if (!record) {
      throw new AppError("Encounter not found", HTTP_STATUS.NOT_FOUND);
    }
    return this.created(res, record, "Complaint recorded successfully");
  });

  public addPhysicalExamination = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const validatedData = physicalExaminationCreateSchema.safeParse(req.body);
      if (!validatedData.success) {
        const errorMessages = validatedData.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new AppError(
          `Validation failed: ${errorMessages}`,
          HTTP_STATUS.BAD_REQUEST,
        );
      }

      const { id } = req.params;
      const recordService = new EncounterRecordService(context);
      const record = await recordService.addPhysicalExamination(
        id as string,
        validatedData.data,
      );
      if (!record) {
        throw new AppError("Encounter not found", HTTP_STATUS.NOT_FOUND);
      }
      return this.created(
        res,
        record,
        "Physical examination recorded successfully",
      );
    },
  );

  public addProvisionalDiagnosis = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const validatedData = provisionalDiagnosisCreateSchema.safeParse(
        req.body,
      );
      if (!validatedData.success) {
        const errorMessages = validatedData.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new AppError(
          `Validation failed: ${errorMessages}`,
          HTTP_STATUS.BAD_REQUEST,
        );
      }

      const { id } = req.params;
      const recordService = new EncounterRecordService(context);
      const record = await recordService.addProvisionalDiagnosis(
        id as string,
        validatedData.data,
      );
      if (!record) {
        throw new AppError("Encounter not found", HTTP_STATUS.NOT_FOUND);
      }
      return this.created(
        res,
        record,
        "Provisional diagnosis recorded successfully",
      );
    },
  );

  public addConfirmDiagnosis = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const validatedData = confirmDiagnosisCreateSchema.safeParse(req.body);
      if (!validatedData.success) {
        const errorMessages = validatedData.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new AppError(
          `Validation failed: ${errorMessages}`,
          HTTP_STATUS.BAD_REQUEST,
        );
      }

      const { id } = req.params;
      const recordService = new EncounterRecordService(context);
      const record = await recordService.addConfirmDiagnosis(
        id as string,
        validatedData.data,
      );
      if (!record) {
        throw new AppError("Encounter not found", HTTP_STATUS.NOT_FOUND);
      }
      return this.created(res, record, "Final diagnosis recorded successfully");
    },
  );

  public addTest = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const validatedData = testCreateSchema.safeParse(req.body);
    if (!validatedData.success) {
      const errorMessages = validatedData.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      throw new AppError(
        `Validation failed: ${errorMessages}`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const { id } = req.params;
    const recordService = new EncounterRecordService(context);
    const record = await recordService.addTest(
      id as string,
      validatedData.data,
    );
    if (!record) {
      throw new AppError("Encounter not found", HTTP_STATUS.NOT_FOUND);
    }
    return this.created(res, record, "Test recorded successfully");
  });

  public addTreatment = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const validatedData = treatmentCreateSchema.safeParse(req.body);
    if (!validatedData.success) {
      const errorMessages = validatedData.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      throw new AppError(
        `Validation failed: ${errorMessages}`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const { id } = req.params;
    const recordService = new EncounterRecordService(context);
    const record = await recordService.addTreatment(
      id as string,
      validatedData.data,
    );
    if (!record) {
      throw new AppError("Encounter not found", HTTP_STATUS.NOT_FOUND);
    }
    return this.created(res, record, "Treatment recorded successfully");
  });

  public addMedication = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const validatedData = medicationCreateSchema.safeParse(req.body);
    if (!validatedData.success) {
      const errorMessages = validatedData.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      throw new AppError(
        `Validation failed: ${errorMessages}`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const { id } = req.params;
    const recordService = new EncounterRecordService(context);
    const record = await recordService.addMedication(
      id as string,
      validatedData.data,
    );
    if (!record) {
      throw new AppError("Encounter not found", HTTP_STATUS.NOT_FOUND);
    }
    return this.created(res, record, "Medication recorded successfully");
  });

  public addDocument = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const validatedData = documentCreateSchema.safeParse(req.body);
    if (!validatedData.success) {
      const errorMessages = validatedData.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      throw new AppError(
        `Validation failed: ${errorMessages}`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const { id } = req.params;
    const recordService = new EncounterRecordService(context);
    const record = await recordService.addDocument(
      id as string,
      validatedData.data,
    );
    if (!record) {
      throw new AppError("Encounter not found", HTTP_STATUS.NOT_FOUND);
    }
    return this.created(res, record, "Document recorded successfully");
  });
}
