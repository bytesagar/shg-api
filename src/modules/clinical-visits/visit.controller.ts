import { Response } from "express";
import { BaseController } from "../../core/base.controller";
import { catchAsync } from "../../utils/catch-async";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import { AuthRequest } from "../../middlewares/auth.middleware";
import {
  ENCOUNTER_UPDATE_SCHEMAS,
  complaintCreateSchema,
  confirmDiagnosisCreateSchema,
  historyCreateSchema,
  medicationCreateSchema,
  opdEncounterCreateSchema,
  physicalExaminationCreateSchema,
  provisionalDiagnosisCreateSchema,
  testCreateSchema,
  testUpdateSchema,
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
    const { patientId, page, pageSize } = req.query;

    const visitService = new VisitService(context);
    const visits = await visitService.listVisits({
      patientId: typeof patientId === "string" ? patientId : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
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

  public updateTest = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const validatedData = testUpdateSchema.safeParse(req.body);
    if (!validatedData.success) {
      const errorMessages = validatedData.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      throw new AppError(
        `Validation failed: ${errorMessages}`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const { visitId, testId } = req.params;
    const recordService = new VisitRecordService(context);
    const record = await recordService.updateTest(
      visitId as string,
      testId as string,
      validatedData.data,
    );
    if (!record) {
      throw new AppError("Test not found", HTTP_STATUS.NOT_FOUND);
    }
    return this.ok(res, record, "Test updated successfully");
  });

  /**
   * Generic update for a visit-scoped encounter detail record:
   *   PATCH /visits/:visitId/:resource/:id
   * `:resource` is the URL slug (complaints, medications, …) and selects both
   * the validation schema and the target table. Tests keep their own route.
   */
  public updateEncounterRecord = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const { visitId, resource, id } = req.params;

      const schema =
        ENCOUNTER_UPDATE_SCHEMAS[
          resource as keyof typeof ENCOUNTER_UPDATE_SCHEMAS
        ];
      if (!schema) {
        throw new AppError(
          `Unknown encounter resource: ${resource}`,
          HTTP_STATUS.NOT_FOUND,
        );
      }

      const validatedData = schema.safeParse(req.body);
      if (!validatedData.success) {
        const errorMessages = validatedData.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new AppError(
          `Validation failed: ${errorMessages}`,
          HTTP_STATUS.BAD_REQUEST,
        );
      }

      const recordService = new VisitRecordService(context);
      const record = await recordService.updateEncounterRecord(
        visitId as string,
        resource as string,
        id as string,
        validatedData.data,
      );
      if (!record) {
        throw new AppError(
          `${resource} record not found`,
          HTTP_STATUS.NOT_FOUND,
        );
      }
      return this.ok(res, record, "Record updated successfully");
    },
  );

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

  public addOpdEncounter = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const validatedData = opdEncounterCreateSchema.safeParse(req.body);
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
      const record = await recordService.addOpdEncounter(
        visitId as string,
        validatedData.data,
      );
      if (!record) {
        throw new AppError("Visit not found", HTTP_STATUS.NOT_FOUND);
      }
      return this.created(res, record, "OPD encounter recorded successfully");
    },
  );
}
