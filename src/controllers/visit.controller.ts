import { Response } from "express";
import { BaseController } from "./base.controller";
import { catchAsync } from "../utils/catch-async";
import { AppError } from "../utils/app-error";
import { HTTP_STATUS } from "../config/constants";
import { AuthRequest } from "../middlewares/auth.middleware";
import {
  complaintCreateSchema,
  confirmDiagnosisCreateSchema,
  historyCreateSchema,
  medicationCreateSchema,
  physicalExaminationCreateSchema,
  provisionalDiagnosisCreateSchema,
  testCreateSchema,
  treatmentCreateSchema,
  visitCreateSchema,
  vitalsCreateSchema,
} from "../validations/visit.validation";
import { VisitService } from "../services/visit.service";
import { VisitRecordService } from "../services/visit-record.service";
import { requireFacilityContext } from "../utils/request-context";

export class VisitController extends BaseController {
  public createVisit = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);

    const validatedData = visitCreateSchema.safeParse(req.body);
    if (!validatedData.success) {
      const errorMessages = validatedData.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      throw new AppError(
        `Validation failed: ${errorMessages}`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const visitService = new VisitService(context);
    const visit = await visitService.createVisit(validatedData.data);
    if (!visit) {
      throw new AppError("Patient not found", HTTP_STATUS.NOT_FOUND);
    }

    return this.created(res, visit, "Visit created successfully");
  });

  public getVisit = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);

    const { visitId } = req.params;
    const visitService = new VisitService(context);
    const visit = await visitService.getVisitById(visitId as string);
    if (!visit) {
      throw new AppError("Visit not found", HTTP_STATUS.NOT_FOUND);
    }
    return this.ok(res, visit, "Visit retrieved successfully");
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

    const { visitId } = req.params;
    const recordService = new VisitRecordService(context);
    const record = await recordService.addVitals(
      visitId as string,
      validatedData.data,
    );
    if (!record) {
      throw new AppError("Visit not found", HTTP_STATUS.NOT_FOUND);
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

    const { visitId } = req.params;
    const recordService = new VisitRecordService(context);
    const record = await recordService.addHistory(
      visitId as string,
      validatedData.data,
    );
    if (!record) {
      throw new AppError("Visit not found", HTTP_STATUS.NOT_FOUND);
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

    const { visitId } = req.params;
    const recordService = new VisitRecordService(context);
    const record = await recordService.addComplaint(
      visitId as string,
      validatedData.data,
    );
    if (!record) {
      throw new AppError("Visit not found", HTTP_STATUS.NOT_FOUND);
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

      const { visitId } = req.params;
      const recordService = new VisitRecordService(context);
      const record = await recordService.addPhysicalExamination(
        visitId as string,
        validatedData.data,
      );
      if (!record) {
        throw new AppError("Visit not found", HTTP_STATUS.NOT_FOUND);
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

      const { visitId } = req.params;
      const recordService = new VisitRecordService(context);
      const record = await recordService.addProvisionalDiagnosis(
        visitId as string,
        validatedData.data,
      );
      if (!record) {
        throw new AppError("Visit not found", HTTP_STATUS.NOT_FOUND);
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

      const { visitId } = req.params;
      const recordService = new VisitRecordService(context);
      const record = await recordService.addConfirmDiagnosis(
        visitId as string,
        validatedData.data,
      );
      if (!record) {
        throw new AppError("Visit not found", HTTP_STATUS.NOT_FOUND);
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

    const { visitId } = req.params;
    const recordService = new VisitRecordService(context);
    const record = await recordService.addTest(
      visitId as string,
      validatedData.data,
    );
    if (!record) {
      throw new AppError("Visit not found", HTTP_STATUS.NOT_FOUND);
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

    const { visitId } = req.params;
    const recordService = new VisitRecordService(context);
    const record = await recordService.addTreatment(
      visitId as string,
      validatedData.data,
    );
    if (!record) {
      throw new AppError("Visit not found", HTTP_STATUS.NOT_FOUND);
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

    const { visitId } = req.params;
    const recordService = new VisitRecordService(context);
    const record = await recordService.addMedication(
      visitId as string,
      validatedData.data,
    );
    if (!record) {
      throw new AppError("Visit not found", HTTP_STATUS.NOT_FOUND);
    }
    return this.created(res, record, "Medication recorded successfully");
  });

  public addDocument = catchAsync(async () => {
    throw new AppError(
      "This endpoint is deprecated. Use POST /attachments/generate-upload-url, upload to S3, then POST /attachments with a sourceType from ATTACHMENT_SOURCES (see server constants), sourceId, and facilityId when required for that source.",
      HTTP_STATUS.GONE,
    );
  });
}
