import { Response } from "express";
import { BaseController } from "../../core/base.controller";
import { catchAsync } from "../../utils/catch-async";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import { AuthRequest } from "../../middlewares/auth.middleware";
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
  visitStatusUpdateSchema,
  vitalsCreateSchema,
} from "./visit.validation";
import { VisitService } from "./visit.service";
import { VisitRecordService } from "./visit-record.service";
import { requireFacilityContext } from "../../utils/request-context";

export class VisitController extends BaseController {
  public listVisits = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const { patientId } = req.query;

    const visitService = new VisitService(context);
    const visits = await visitService.listVisits(patientId as string);
    return this.ok(res, visits, "Visits retrieved successfully");
  });

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

  public updateVisitStatus = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);

      const validatedData = visitStatusUpdateSchema.safeParse(req.body);
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
      const visitService = new VisitService(context);
      const updated = await visitService.updateVisitStatus({
        visitId: visitId as string,
        status: validatedData.data.status,
      });
      if (!updated) {
        throw new AppError("Visit not found", HTTP_STATUS.NOT_FOUND);
      }

      return this.ok(res, updated, "Visit status updated successfully");
    },
  );

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
    return this.created(res, record, "Vitals encounter recorded successfully");
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
    return this.created(res, record, "History encounter recorded successfully");
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
    return this.created(
      res,
      record,
      "Complaint encounter recorded successfully",
    );
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
        "Physical examination encounter recorded successfully",
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
        "Provisional diagnosis encounter recorded successfully",
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
      return this.created(
        res,
        record,
        "Final diagnosis encounter recorded successfully",
      );
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
    return this.created(res, record, "Test encounter recorded successfully");
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
    return this.created(
      res,
      record,
      "Treatment encounter recorded successfully",
    );
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
    return this.created(
      res,
      record,
      "Medication encounter recorded successfully",
    );
  });
}
