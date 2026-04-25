import { Response } from "express";
import { BaseController } from "../../core/base.controller";
import { catchAsync } from "../../utils/catch-async";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { requireFacilityContext } from "../../utils/request-context";
import { parseFhirSearchQuery } from "./fhir-search.query";
import { FhirSearchService } from "./fhir-search.service";

export class FhirSearchController extends BaseController {
  public searchPatient = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const query = parseFhirSearchQuery(req.query as Record<string, unknown>);
    const service = new FhirSearchService(context);
    const bundle = await service.searchPatient(query);
    return res.status(200).json(bundle);
  });

  public searchObservation = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const query = parseFhirSearchQuery(req.query as Record<string, unknown>);
    const service = new FhirSearchService(context);
    const bundle = await service.searchObservation(query);
    return res.status(200).json(bundle);
  });

  public searchCondition = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const query = parseFhirSearchQuery(req.query as Record<string, unknown>);
    const service = new FhirSearchService(context);
    const bundle = await service.searchCondition(query);
    return res.status(200).json(bundle);
  });

  public searchMedicationRequest = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const query = parseFhirSearchQuery(req.query as Record<string, unknown>);
      const service = new FhirSearchService(context);
      const bundle = await service.searchMedicationRequest(query);
      return res.status(200).json(bundle);
    },
  );

  public searchEncounter = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const query = parseFhirSearchQuery(req.query as Record<string, unknown>);
    const service = new FhirSearchService(context);
    const bundle = await service.searchEncounter(query);
    return res.status(200).json(bundle);
  });

  public searchAllergyIntolerance = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const query = parseFhirSearchQuery(req.query as Record<string, unknown>);
      const service = new FhirSearchService(context);
      const bundle = await service.searchAllergyIntolerance(query);
      return res.status(200).json(bundle);
    },
  );

  public searchAppointment = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const query = parseFhirSearchQuery(req.query as Record<string, unknown>);
    const service = new FhirSearchService(context);
    const bundle = await service.searchAppointment(query);
    return res.status(200).json(bundle);
  });

  public searchDocumentReference = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const query = parseFhirSearchQuery(req.query as Record<string, unknown>);
      const service = new FhirSearchService(context);
      const bundle = await service.searchDocumentReference(query);
      return res.status(200).json(bundle);
    },
  );

  public searchOrganization = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const query = parseFhirSearchQuery(req.query as Record<string, unknown>);
    const service = new FhirSearchService(context);
    const bundle = await service.searchOrganization(query);
    return res.status(200).json(bundle);
  });

  public searchPractitionerRole = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const query = parseFhirSearchQuery(req.query as Record<string, unknown>);
      const service = new FhirSearchService(context);
      const bundle = await service.searchPractitionerRole(query);
      return res.status(200).json(bundle);
    },
  );

  public searchEpisodeOfCare = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const query = parseFhirSearchQuery(req.query as Record<string, unknown>);
      const service = new FhirSearchService(context);
      const bundle = await service.searchEpisodeOfCare(query);
      return res.status(200).json(bundle);
    },
  );

  public searchCarePlan = catchAsync(async (req: AuthRequest, res: Response) => {
    const context = requireFacilityContext(req);
    const query = parseFhirSearchQuery(req.query as Record<string, unknown>);
    const service = new FhirSearchService(context);
    const bundle = await service.searchCarePlan(query);
    return res.status(200).json(bundle);
  });

  public searchImmunization = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const context = requireFacilityContext(req);
      const query = parseFhirSearchQuery(req.query as Record<string, unknown>);
      const service = new FhirSearchService(context);
      const bundle = await service.searchImmunization(query);
      return res.status(200).json(bundle);
    },
  );
}

