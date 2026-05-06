import { db } from "../../db";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { encounters, visits } from "../../db/schema";
import { FacilityContext } from "../../context/facility-context";
import { AppError } from "../../utils/app-error";
import { HTTP_STATUS } from "../../config/constants";
import { ImmunizationRepository } from "./immunization.repository";
import { PatientRepository } from "../patients/patient.repository";
import type {
  ChildImmunizationUpsertInput,
  ImmunizationHistoryCreateInput,
} from "./immunizations.validation";

export class ImmunizationService {
  private readonly repo: ImmunizationRepository;
  private readonly patientRepository: PatientRepository;

  constructor(private readonly context: FacilityContext) {
    this.repo = new ImmunizationRepository(context);
    this.patientRepository = new PatientRepository(context);
  }

  public async upsertChildImmunizationProfile(
    patientId: string,
    input: ChildImmunizationUpsertInput,
  ) {
    return this.repo.upsertChildImmunizationProfile({
      patientId,
      ...input,
    });
  }

  public async createImmunizationHistory(
    patientId: string,
    input: ImmunizationHistoryCreateInput,
  ) {
    const patient = await this.patientRepository.findById(patientId);
    if (!patient) {
      throw new AppError("Patient not found", HTTP_STATUS.NOT_FOUND);
    }

    const dateAt = new Date(`${input.date}T00:00:00.000Z`);
    const vaccinatedDateAt =
      input.vaccinatedDate != null
        ? new Date(`${input.vaccinatedDate}T00:00:00.000Z`)
        : input.vaccinated
          ? dateAt
          : null;

    return db.transaction(async (tx) => {
      const activeStatuses = ["planned", "arrived", "in_progress"] as const;
      const activeVisit = await tx
        .select()
        .from(visits)
        .where(
          and(
            eq(visits.patientId, patient.id),
            eq(visits.facilityId, this.context.facilityId),
            isNull(visits.deletedAt),
            or(inArray(visits.status, activeStatuses), isNull(visits.status)),
          ),
        )
        .orderBy(desc(visits.date))
        .limit(1);

      const visit =
        activeVisit[0] ??
        (
          await tx
            .insert(visits)
            .values({
              date: input.date,
              reason: "IMMUNIZATION",
              service: "immunization",
              status: "finished",
              patientId: patient.id,
              facilityId: this.context.facilityId,
              doctorId: this.context.userId,
            })
            .returning()
        )[0];

      if (!visit) {
        throw new AppError(
          "Unable to create visit for immunization",
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
        );
      }

      const [encounter] = await tx
        .insert(encounters)
        .values({
          visitId: visit.id,
          patientId: patient.id,
          facilityId: this.context.facilityId,
          encounterAt: new Date(),
          reason: "IMMUNIZATION",
          service: visit.service ?? "immunization",
          status: "finished",
          encounterType: "IMMUNIZATION",
          doctorId: this.context.userId,
          createdBy: this.context.userId,
          updatedBy: this.context.userId,
        })
        .returning();

      if (!encounter) {
        throw new AppError(
          "Unable to create encounter for immunization",
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
        );
      }

      const created = await this.repo.createImmunizationHistoryForPatient(tx, {
        patientId: patient.id,
        visitId: visit.id,
        encounterId: encounter.id,
        vaccineName: input.vaccineName,
        date: dateAt,
        vaccinated: input.vaccinated ? 1 : 0,
        vaccinatedDate: vaccinatedDateAt,
        aefi: input.aefi ?? null,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      });

      if (!created) {
        throw new AppError(
          "Child immunization profile not found. Create it first.",
          HTTP_STATUS.BAD_REQUEST,
        );
      }

      return created;
    });
  }
}
