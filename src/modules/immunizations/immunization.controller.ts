import { Response } from "express";
import { z } from "zod";
import { BaseController } from "../../core/base.controller";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { requireFacilityContext } from "../../utils/request-context";
import { catchAsync } from "../../utils/catch-async";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import { ImmunizationService } from "./immunization.service";
import {
  aefiCreateSchema,
  campaignCreateSchema,
  childImmunizationUpsertSchema,
  feedingMilestonesUpsertSchema,
  hpvSessionCreateSchema,
  immunizationDosesCreateSchema,
} from "./immunizations.validation";

const uuidParamSchema = z.object({ patientId: z.string().uuid() }).strict();

function parseOrThrow<S extends z.ZodTypeAny>(
  schema: S,
  body: unknown,
  label: string,
): z.infer<S> {
  const result = schema.safeParse(body);
  if (!result.success) {
    const errorMessages = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    throw new AppError(
      `${label} validation failed: ${errorMessages}`,
      HTTP_STATUS.BAD_REQUEST,
    );
  }
  return result.data;
}

export class ImmunizationController extends BaseController {
  // ---------------------------------------------------------------------------
  // Child immunization profile
  // ---------------------------------------------------------------------------

  public upsertChildImmunizationProfile = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const paramsParsed = uuidParamSchema.safeParse(req.params);
      if (!paramsParsed.success) {
        throw new AppError("Invalid patientId", HTTP_STATUS.BAD_REQUEST);
      }
      const body = parseOrThrow(
        childImmunizationUpsertSchema,
        req.body,
        "Child immunization profile",
      );

      const service = new ImmunizationService(context);
      const profile = await service.upsertChildImmunizationProfile(
        paramsParsed.data.patientId,
        body,
      );
      return this.ok(res, profile, "Child immunization profile saved");
    },
  );

  // ---------------------------------------------------------------------------
  // Dose recording — batch + back-compat single
  // ---------------------------------------------------------------------------

  public createImmunizationHistory = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const paramsParsed = uuidParamSchema.safeParse(req.params);
      if (!paramsParsed.success) {
        throw new AppError("Invalid patientId", HTTP_STATUS.BAD_REQUEST);
      }
      const body = parseOrThrow(
        immunizationDosesCreateSchema,
        req.body,
        "Immunization doses",
      );

      const service = new ImmunizationService(context);
      const doses = service.normaliseDosesPayload(body);
      const result = await service.recordDoses(
        paramsParsed.data.patientId,
        doses,
      );

      if (!result.ok) {
        switch (result.error.kind) {
          case "PATIENT_NOT_FOUND":
            throw new AppError("Patient not found", HTTP_STATUS.NOT_FOUND);
          case "PROFILE_REQUIRED":
            throw new AppError(
              "Child immunization profile not found. Create it first.",
              HTTP_STATUS.BAD_REQUEST,
            );
          case "UNKNOWN_VACCINE":
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
              success: false,
              message: `Unknown vaccine '${result.error.vaccineCode}'`,
              conflictingIndex: result.error.conflictingIndex,
            });
          case "DOSE_NUMBER_OUT_OF_RANGE":
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
              success: false,
              message: `Dose ${result.error.doseNumber} exceeds total doses (${result.error.totalDoses}) for ${result.error.vaccineCode}`,
              conflictingIndex: result.error.conflictingIndex,
            });
          case "DUPLICATE_IN_BATCH":
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
              success: false,
              message: `Duplicate entry for ${result.error.vaccineCode}/${result.error.doseNumber} within the batch`,
              conflictingIndex: result.error.conflictingIndex,
            });
          case "DUPLICATE_EXISTS":
            return res.status(HTTP_STATUS.CONFLICT).json({
              success: false,
              message: `${result.error.vaccineCode} dose ${result.error.doseNumber} already recorded for this patient`,
              conflictingIndex: result.error.conflictingIndex,
            });
        }
      }

      return this.created(
        res,
        { items: result.items },
        `${result.items.length} immunization record(s) created`,
      );
    },
  );

  // ---------------------------------------------------------------------------
  // Vaccine catalog + per-patient schedule
  // ---------------------------------------------------------------------------

  public listVaccineCatalog = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const service = new ImmunizationService(context);
      const catalog = await service.listVaccineCatalog();
      return this.ok(res, catalog, "Vaccine catalog retrieved");
    },
  );

  public getPatientSchedule = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const paramsParsed = uuidParamSchema.safeParse(req.params);
      if (!paramsParsed.success) {
        throw new AppError("Invalid patientId", HTTP_STATUS.BAD_REQUEST);
      }
      const service = new ImmunizationService(context);
      const schedule = await service.getPatientSchedule(
        paramsParsed.data.patientId,
      );
      return this.ok(res, schedule, "Patient immunization schedule retrieved");
    },
  );

  // ---------------------------------------------------------------------------
  // AEFI
  // ---------------------------------------------------------------------------

  public recordAefi = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const body = parseOrThrow(aefiCreateSchema, req.body, "AEFI");
    const service = new ImmunizationService(context);
    const event = await service.recordAefi(body);
    return this.created(res, event, "AEFI event recorded");
  });

  public listAefiEvents = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const from = typeof req.query.from === "string" ? new Date(req.query.from) : undefined;
      const to = typeof req.query.to === "string" ? new Date(req.query.to) : undefined;
      const patientId =
        typeof req.query.patientId === "string" ? req.query.patientId : undefined;
      const service = new ImmunizationService(context);
      const events = await service.listAefiEvents({
        from,
        toExclusive: to,
        patientId,
      });
      return this.ok(res, events, "AEFI events retrieved");
    },
  );

  // ---------------------------------------------------------------------------
  // Campaigns + HPV
  // ---------------------------------------------------------------------------

  public createCampaign = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const body = parseOrThrow(campaignCreateSchema, req.body, "Campaign");
      const service = new ImmunizationService(context);
      const created = await service.createCampaign(body);
      return this.created(res, created, "Campaign recorded");
    },
  );

  public listCampaigns = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const service = new ImmunizationService(context);
      const items = await service.listCampaigns({
        vaccineCode:
          typeof req.query.vaccineCode === "string"
            ? req.query.vaccineCode
            : undefined,
        year:
          typeof req.query.year === "string"
            ? Number(req.query.year)
            : undefined,
      });
      return this.ok(res, items, "Campaigns retrieved");
    },
  );

  public createHpvSession = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const body = parseOrThrow(hpvSessionCreateSchema, req.body, "HPV session");
      const service = new ImmunizationService(context);
      const created = await service.createHpvSession(body);
      return this.created(res, created, "HPV session recorded");
    },
  );

  public listHpvSessions = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const from = typeof req.query.from === "string" ? new Date(req.query.from) : undefined;
      const to = typeof req.query.to === "string" ? new Date(req.query.to) : undefined;
      const service = new ImmunizationService(context);
      const items = await service.listHpvSessions({
        from,
        toExclusive: to,
      });
      return this.ok(res, items, "HPV sessions retrieved");
    },
  );

  // ---------------------------------------------------------------------------
  // Feeding milestones (HMIS 2.1)
  // ---------------------------------------------------------------------------

  public upsertFeedingMilestones = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const paramsParsed = uuidParamSchema.safeParse(req.params);
      if (!paramsParsed.success) {
        throw new AppError("Invalid patientId", HTTP_STATUS.BAD_REQUEST);
      }
      const body = parseOrThrow(
        feedingMilestonesUpsertSchema,
        req.body,
        "Feeding milestones",
      );
      const service = new ImmunizationService(context);
      const saved = await service.upsertFeedingMilestones(
        paramsParsed.data.patientId,
        body,
      );
      return this.ok(res, saved, "Feeding milestones saved");
    },
  );

  public getFeedingMilestones = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const paramsParsed = uuidParamSchema.safeParse(req.params);
      if (!paramsParsed.success) {
        throw new AppError("Invalid patientId", HTTP_STATUS.BAD_REQUEST);
      }
      const service = new ImmunizationService(context);
      const data = await service.getFeedingMilestones(
        paramsParsed.data.patientId,
      );
      return this.ok(res, data, "Feeding milestones retrieved");
    },
  );
}
