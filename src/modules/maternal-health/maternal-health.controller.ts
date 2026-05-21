import { Response } from "express";
import { z } from "zod";
import { BaseController } from "../../core/base.controller";
import { catchAsync } from "../../utils/catch-async";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { requireFacilityContext } from "../../utils/request-context";
import { parseListQuery } from "../../utils/query-parser";
import {
  aamaIncentivePatchSchema,
  antenatalCareCreateSchema,
  antenatalCaresListQuerySchema,
  deliveriesListQuerySchema,
  deliveryCreateSchema,
  facilityPopulationTargetUpsertSchema,
  maternalDeathCreateSchema,
  newbornDeathCreateSchema,
  postAbortionCareCreateSchema,
  postnatalCareCreateSchema,
  postnatalCaresListQuerySchema,
  pregnanciesListQuerySchema,
  pregnancyComplicationCreateSchema,
  pregnancyCreateSchema,
  previousPregnanciesBulkCreateSchema,
  safeAbortionComplicationCreateSchema,
  safeAbortionCreateSchema,
  screeningPatchSchema,
  tdDosesPatchSchema,
} from "./maternal-health.validation";
import { MaternalHealthService } from "./maternal-health.service";

function parseOrThrow<S extends z.ZodTypeAny>(
  schema: S,
  body: unknown,
): z.infer<S> {
  const result = schema.safeParse(body);
  if (!result.success) {
    const errorMessages = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    throw new AppError(
      `Validation failed: ${errorMessages}`,
      HTTP_STATUS.BAD_REQUEST,
    );
  }
  return result.data;
}

export class MaternalHealthController extends BaseController {
  public createPregnancy = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);

      const validatedData = pregnancyCreateSchema.safeParse(req.body);
      if (!validatedData.success) {
        const errorMessages = validatedData.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new AppError(
          `Validation failed: ${errorMessages}`,
          HTTP_STATUS.BAD_REQUEST,
        );
      }

      const service = new MaternalHealthService(context);
      const result = await service.createPregnancy({
        visitId: req.params.visitId as string,
        ...validatedData.data,
      });

      if (result && typeof result === "object" && "error" in result) {
        if (result.error === "VISIT_NOT_FOUND") {
          throw new AppError("Visit not found", HTTP_STATUS.NOT_FOUND);
        }
        if (result.error === "VISIT_NOT_ACTIVE") {
          throw new AppError(
            "Cannot record maternal health without an active visit",
            HTTP_STATUS.CONFLICT,
          );
        }
        if (result.error === "ACTIVE_PREGNANCY_EXISTS") {
          throw new AppError(
            "An active pregnancy already exists for this patient",
            HTTP_STATUS.CONFLICT,
          );
        }
      }

      return this.created(res, result, "Pregnancy created successfully");
    },
  );

  public getPregnancy = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const service = new MaternalHealthService(context);
    const pregnancy = await service.getPregnancyById(req.params.id as string);
    if (!pregnancy) {
      throw new AppError("Pregnancy not found", HTTP_STATUS.NOT_FOUND);
    }
    return this.ok(res, pregnancy, "Pregnancy retrieved successfully");
  });

  public listPregnancies = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const query = parseListQuery(req.query, pregnanciesListQuerySchema);

      const service = new MaternalHealthService(context);
      const result = await service.listPregnancies(query);
      return this.ok(res, result, "Pregnancies retrieved successfully");
    },
  );

  public createAntenatalCare = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);

      const validatedData = antenatalCareCreateSchema.safeParse(req.body);
      if (!validatedData.success) {
        const errorMessages = validatedData.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new AppError(
          `Validation failed: ${errorMessages}`,
          HTTP_STATUS.BAD_REQUEST,
        );
      }

      const service = new MaternalHealthService(context);
      const result = await service.createAntenatalCare({
        pregnancyId: req.params.pregnancyId as string,
        ...validatedData.data,
      });

      if (result && typeof result === "object" && "error" in result) {
        if (result.error === "VISIT_NOT_FOUND") {
          throw new AppError("Visit not found", HTTP_STATUS.NOT_FOUND);
        }
        if (result.error === "VISIT_NOT_ACTIVE") {
          throw new AppError(
            "Cannot record maternal health without an active visit",
            HTTP_STATUS.CONFLICT,
          );
        }
        if (result.error === "PREGNANCY_NOT_FOUND") {
          throw new AppError("Pregnancy not found", HTTP_STATUS.NOT_FOUND);
        }
        if (result.error === "PREGNANCY_PATIENT_MISMATCH") {
          throw new AppError(
            "Pregnancy does not belong to patient",
            HTTP_STATUS.BAD_REQUEST,
          );
        }
      }

      return this.created(res, result, "Antenatal care created successfully");
    },
  );

  public listAntenatalCares = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const query = parseListQuery(req.query, antenatalCaresListQuerySchema);

      const service = new MaternalHealthService(context);
      const result = await service.listAntenatalCares(query);
      return this.ok(res, result, "Antenatal cares retrieved successfully");
    },
  );

  public createDelivery = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);

      const validatedData = deliveryCreateSchema.safeParse(req.body);
      if (!validatedData.success) {
        const errorMessages = validatedData.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new AppError(
          `Validation failed: ${errorMessages}`,
          HTTP_STATUS.BAD_REQUEST,
        );
      }

      const service = new MaternalHealthService(context);
      const result = await service.createDelivery({
        pregnancyId: req.params.pregnancyId as string,
        ...validatedData.data,
      });

      if (result && typeof result === "object" && "error" in result) {
        if (result.error === "VISIT_NOT_FOUND") {
          throw new AppError("Visit not found", HTTP_STATUS.NOT_FOUND);
        }
        if (result.error === "VISIT_NOT_ACTIVE") {
          throw new AppError(
            "Cannot record maternal health without an active visit",
            HTTP_STATUS.CONFLICT,
          );
        }
        if (result.error === "PREGNANCY_NOT_FOUND") {
          throw new AppError("Pregnancy not found", HTTP_STATUS.NOT_FOUND);
        }
        if (result.error === "PREGNANCY_PATIENT_MISMATCH") {
          throw new AppError(
            "Pregnancy does not belong to patient",
            HTTP_STATUS.BAD_REQUEST,
          );
        }
      }

      return this.created(res, result, "Delivery created successfully");
    },
  );

  public listDeliveries = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const query = parseListQuery(req.query, deliveriesListQuerySchema);

      const service = new MaternalHealthService(context);
      const result = await service.listDeliveries(query);
      return this.ok(res, result, "Deliveries retrieved successfully");
    },
  );

  public createPostnatalCare = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);

      const validatedData = postnatalCareCreateSchema.safeParse(req.body);
      if (!validatedData.success) {
        const errorMessages = validatedData.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new AppError(
          `Validation failed: ${errorMessages}`,
          HTTP_STATUS.BAD_REQUEST,
        );
      }

      const service = new MaternalHealthService(context);
      const result = await service.createPostnatalCare({
        pregnancyId: req.params.pregnancyId as string,
        ...validatedData.data,
      });

      if (result && typeof result === "object" && "error" in result) {
        if (result.error === "VISIT_NOT_FOUND") {
          throw new AppError("Visit not found", HTTP_STATUS.NOT_FOUND);
        }
        if (result.error === "VISIT_NOT_ACTIVE") {
          throw new AppError(
            "Cannot record maternal health without an active visit",
            HTTP_STATUS.CONFLICT,
          );
        }
        if (result.error === "PREGNANCY_NOT_FOUND") {
          throw new AppError("Pregnancy not found", HTTP_STATUS.NOT_FOUND);
        }
        if (result.error === "PREGNANCY_PATIENT_MISMATCH") {
          throw new AppError(
            "Pregnancy does not belong to patient",
            HTTP_STATUS.BAD_REQUEST,
          );
        }
      }

      return this.created(res, result, "Postnatal care created successfully");
    },
  );

  public listPostnatalCares = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const query = parseListQuery(req.query, postnatalCaresListQuerySchema);

      const service = new MaternalHealthService(context);
      const result = await service.listPostnatalCares(query);
      return this.ok(res, result, "Postnatal cares retrieved successfully");
    },
  );

  // ---- HMIS 2082 endpoints ----

  public createComplication = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const data = parseOrThrow(pregnancyComplicationCreateSchema, req.body);
      const service = new MaternalHealthService(context);
      const result = await service.createComplication(
        req.params.pregnancyId as string,
        data,
      );
      if (result && "error" in result && result.error === "PREGNANCY_NOT_FOUND") {
        throw new AppError("Pregnancy not found", HTTP_STATUS.NOT_FOUND);
      }
      return this.created(res, result, "Complication recorded successfully");
    },
  );

  public createPreviousPregnancies = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const data = parseOrThrow(previousPregnanciesBulkCreateSchema, req.body);
      const service = new MaternalHealthService(context);
      const result = await service.createPreviousPregnancies(
        req.params.pregnancyId as string,
        data.items,
      );
      if (result && "error" in result && result.error === "PREGNANCY_NOT_FOUND") {
        throw new AppError("Pregnancy not found", HTTP_STATUS.NOT_FOUND);
      }
      return this.created(
        res,
        result,
        "Previous pregnancies recorded successfully",
      );
    },
  );

  public patchScreening = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const data = parseOrThrow(screeningPatchSchema, req.body);
      const service = new MaternalHealthService(context);
      const result = await service.patchScreening(
        req.params.pregnancyId as string,
        data,
      );
      if (result && "error" in result && result.error === "PREGNANCY_NOT_FOUND") {
        throw new AppError("Pregnancy not found", HTTP_STATUS.NOT_FOUND);
      }
      return this.ok(res, result, "Screening updated successfully");
    },
  );

  public patchTdDoses = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const data = parseOrThrow(tdDosesPatchSchema, req.body);
    const service = new MaternalHealthService(context);
    const result = await service.patchTdDoses(
      req.params.pregnancyId as string,
      data,
    );
    if (result && "error" in result && result.error === "PREGNANCY_NOT_FOUND") {
      throw new AppError("Pregnancy not found", HTTP_STATUS.NOT_FOUND);
    }
    return this.ok(res, result, "TD doses updated successfully");
  });

  public patchAamaIncentive = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const data = parseOrThrow(aamaIncentivePatchSchema, req.body);
      const service = new MaternalHealthService(context);
      const result = await service.patchAamaIncentive(
        req.params.pregnancyId as string,
        data,
      );
      if (result && "error" in result && result.error === "PREGNANCY_NOT_FOUND") {
        throw new AppError("Pregnancy not found", HTTP_STATUS.NOT_FOUND);
      }
      return this.ok(res, result, "Aama incentive updated successfully");
    },
  );

  public createMaternalDeath = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const data = parseOrThrow(maternalDeathCreateSchema, req.body);
      const service = new MaternalHealthService(context);
      const result = await service.createMaternalDeath(data);
      return this.created(res, result, "Maternal death recorded successfully");
    },
  );

  public createNewbornDeath = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const data = parseOrThrow(newbornDeathCreateSchema, req.body);
      const service = new MaternalHealthService(context);
      const result = await service.createNewbornDeath(data);
      return this.created(res, result, "Newborn death recorded successfully");
    },
  );

  public createSafeAbortion = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const data = parseOrThrow(safeAbortionCreateSchema, req.body);
      const service = new MaternalHealthService(context);
      const result = await service.createSafeAbortion(data);
      return this.created(res, result, "Safe abortion recorded successfully");
    },
  );

  public createSafeAbortionComplication = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const data = parseOrThrow(safeAbortionComplicationCreateSchema, req.body);
      const service = new MaternalHealthService(context);
      const result = await service.createSafeAbortionComplication(
        req.params.safeAbortionId as string,
        data,
      );
      return this.created(
        res,
        result,
        "Safe abortion complication recorded successfully",
      );
    },
  );

  public createPostAbortionCare = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const data = parseOrThrow(postAbortionCareCreateSchema, req.body);
      const service = new MaternalHealthService(context);
      const result = await service.createPostAbortionCare(data);
      return this.created(
        res,
        result,
        "Post-abortion care recorded successfully",
      );
    },
  );

  public upsertPopulationTarget = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const data = parseOrThrow(facilityPopulationTargetUpsertSchema, req.body);
      const service = new MaternalHealthService(context);
      const result = await service.upsertPopulationTarget(data);
      return this.created(
        res,
        result,
        "Facility population target saved successfully",
      );
    },
  );

  public listPopulationTargets = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const service = new MaternalHealthService(context);
      const result = await service.listPopulationTargets();
      return this.ok(res, result, "Population targets retrieved successfully");
    },
  );
}
