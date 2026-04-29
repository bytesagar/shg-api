import { db } from "../../db";
import {
  family_plannings,
  family_planning_news,
  family_planning_olds,
  family_planning_removals,
  fp_hormonal_details,
  fp_iucd_details,
} from "../../db/schema";
import { FacilityContext } from "../../context/facility-context";
import { PatientRepository } from "../patients/patient.repository";
import { UserRepository } from "../users/user.repository";
import {
  FamilyPlanningCreateInput,
  FamilyPlanningsListQuery,
} from "./family-planning.validation";
import { FamilyPlanningRepository } from "./family-planning.repository";

export class FamilyPlanningService {
  private patientRepository: PatientRepository;
  private userRepository: UserRepository;
  private familyPlanningRepository: FamilyPlanningRepository;

  constructor(private readonly context: FacilityContext) {
    this.patientRepository = new PatientRepository(context);
    this.userRepository = new UserRepository(context);
    this.familyPlanningRepository = new FamilyPlanningRepository(context);
  }

  public async createFamilyPlanning(input: FamilyPlanningCreateInput) {
    const patient = await this.patientRepository.findById(input.patientId);
    if (!patient) return { error: "PATIENT_NOT_FOUND" as const };

    const serviceProviderId = input.serviceProviderId ?? this.context.userId;
    const provider = await this.userRepository.findById(serviceProviderId);

    return db.transaction(async (tx) => {
      const fp = await tx
        .insert(family_plannings)
        .values({
          serviceDate: input.serviceDate,
          patientId: input.patientId,
          facilityId: this.context.facilityId,
          serviceType: input.serviceType,
          serviceProviderId: provider?.id ?? null,
          serviceProviderFirstName: provider?.firstName ?? null,
          serviceProviderLastName: provider?.lastName ?? null,
          createdBy: this.context.userId,
          updatedBy: this.context.userId,
        })
        .returning();

      const familyPlanning = fp[0];

      if (input.details?.previous) {
        const oldInserted = await tx
          .insert(family_planning_olds)
          .values({
            previousDevice: input.details.previous.previousDevice ?? null,
            continueSameDevice:
              input.details.previous.continueSameDevice ?? null,
            discontinueReason: input.details.previous.discontinueReason ?? null,
            discontinueReasonOther:
              input.details.previous.discontinueReasonOther ?? null,
            createdBy: this.context.userId,
            updatedBy: this.context.userId,
          })
          .returning();

        const old = oldInserted[0];

        if (input.serviceType === "removal") {
          const removalDetails = input.details;
          const removalInserted = await tx
            .insert(family_planning_removals)
            .values({
              familyPlanningId: familyPlanning.id,
              previousDeviceId: old.id,
              lastMenstrualPeriod: removalDetails.lastMenstrualPeriod ?? null,
              removalDate: removalDetails.removalDate,
              placeOfFpDeviceUsed: removalDetails.placeOfFpDeviceUsed ?? null,
              otherHealthFacilityName:
                removalDetails.otherHealthFacilityName ?? null,
              removalReason: removalDetails.removalReason ?? null,
              createdBy: this.context.userId,
              updatedBy: this.context.userId,
              deletedBy: null,
            })
            .returning();

          return { familyPlanning, details: removalInserted[0] };
        }

        const newDetails = input.details;
        const newInserted = await tx
          .insert(family_planning_news)
          .values({
            familyPlanningId: familyPlanning.id,
            lastMenstrualPeriod: newDetails.lastMenstrualPeriod ?? null,
            previousDeviceId: old.id,
            devicePlanned: newDetails.devicePlanned,
            deviceUsed: newDetails.deviceUsed,
            isActive: newDetails.isActive ?? true,
            deviceNotUsedReason: newDetails.deviceNotUsedReason ?? null,
            usageTimePeriod: newDetails.usageTimePeriod ?? null,
            usageDate: newDetails.usageDate ?? null,
            followUpDate: newDetails.followUpDate ?? null,
            createdBy: this.context.userId,
            updatedBy: this.context.userId,
          })
          .returning();

        const newFp = newInserted[0];
        if (
          newDetails.deviceUsed === "pills" ||
          newDetails.deviceUsed === "depo" ||
          newDetails.deviceUsed === "implant"
        ) {
          await tx.insert(fp_hormonal_details).values({
            newFpId: newFp.id,
            ...newDetails.hormonalDetails,
            createdBy: this.context.userId,
            updatedBy: this.context.userId,
            deletedBy: null,
          });
        }
        if (newDetails.deviceUsed === "iucd") {
          await tx.insert(fp_iucd_details).values({
            newFpId: newFp.id,
            ...newDetails.iucdDetails,
            createdBy: this.context.userId,
            updatedBy: this.context.userId,
            deletedBy: null,
          });
        }

        return { familyPlanning, details: newFp };
      }

      if (input.serviceType === "removal") {
        const removalDetails = input.details;
        const removalInserted = await tx
          .insert(family_planning_removals)
          .values({
            familyPlanningId: familyPlanning.id,
            previousDeviceId: null,
            lastMenstrualPeriod: removalDetails.lastMenstrualPeriod ?? null,
            removalDate: removalDetails.removalDate,
            placeOfFpDeviceUsed: removalDetails.placeOfFpDeviceUsed ?? null,
            otherHealthFacilityName:
              removalDetails.otherHealthFacilityName ?? null,
            removalReason: removalDetails.removalReason ?? null,
            createdBy: this.context.userId,
            updatedBy: this.context.userId,
            deletedBy: null,
          })
          .returning();

        return { familyPlanning, details: removalInserted[0] };
      }

      const newDetails = input.details;
      const newInserted = await tx
        .insert(family_planning_news)
        .values({
          familyPlanningId: familyPlanning.id,
          lastMenstrualPeriod: newDetails.lastMenstrualPeriod ?? null,
          previousDeviceId: null,
          devicePlanned: newDetails.devicePlanned,
          deviceUsed: newDetails.deviceUsed,
          isActive: newDetails.isActive ?? true,
          deviceNotUsedReason: newDetails.deviceNotUsedReason ?? null,
          usageTimePeriod: newDetails.usageTimePeriod ?? null,
          usageDate: newDetails.usageDate ?? null,
          followUpDate: newDetails.followUpDate ?? null,
          createdBy: this.context.userId,
          updatedBy: this.context.userId,
        })
        .returning();

      const newFp = newInserted[0];
      if (
        newDetails.deviceUsed === "pills" ||
        newDetails.deviceUsed === "depo" ||
        newDetails.deviceUsed === "implant"
      ) {
        await tx.insert(fp_hormonal_details).values({
          newFpId: newFp.id,
          ...newDetails.hormonalDetails,
          createdBy: this.context.userId,
          updatedBy: this.context.userId,
          deletedBy: null,
        });
      }
      if (newDetails.deviceUsed === "iucd") {
        await tx.insert(fp_iucd_details).values({
          newFpId: newFp.id,
          ...newDetails.iucdDetails,
          createdBy: this.context.userId,
          updatedBy: this.context.userId,
          deletedBy: null,
        });
      }

      return { familyPlanning, details: newFp };
    });
  }

  public async getFamilyPlanningById(id: string) {
    return this.familyPlanningRepository.findByIdWithDetails(id);
  }

  public async listFamilyPlannings(params: FamilyPlanningsListQuery) {
    return this.familyPlanningRepository.list({
      patientId: params.patientId,
      page: params.page,
      pageSize: params.pageSize,
    });
  }
}
