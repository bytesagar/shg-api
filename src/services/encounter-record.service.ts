import { db } from "../db";
import {
  complaints,
  confirm_diagnoses,
  documents,
  histories,
  medications,
  physical_examinations,
  provisional_diagnoses,
  tests,
  treatments,
  vitals,
} from "../db/schema";
import { FacilityContext } from "../context/facility-context";
import { EncounterRepository } from "../repositories/encounter.repository";
import {
  ComplaintCreateInput,
  ConfirmDiagnosisCreateInput,
  DocumentCreateInput,
  HistoryCreateInput,
  MedicationCreateInput,
  PhysicalExaminationCreateInput,
  ProvisionalDiagnosisCreateInput,
  TestCreateInput,
  TreatmentCreateInput,
  VitalsCreateInput,
} from "../validations/encounter.validation";

export class EncounterRecordService {
  private encounterRepository: EncounterRepository;

  constructor(private readonly context: FacilityContext) {
    this.encounterRepository = new EncounterRepository(context);
  }

  private async getOwnedEncounter(encounterId: string) {
    return this.encounterRepository.findById(encounterId);
  }

  public async addVitals(encounterId: string, input: VitalsCreateInput) {
    const encounter = await this.getOwnedEncounter(encounterId);
    if (!encounter) return null;

    const inserted = await db
      .insert(vitals)
      .values({
        ...input,
        encounterId: encounter.id,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0];
  }

  public async addHistory(encounterId: string, input: HistoryCreateInput) {
    const encounter = await this.getOwnedEncounter(encounterId);
    if (!encounter) return null;

    const inserted = await db
      .insert(histories)
      .values({
        ...input,
        encounterId: encounter.id,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0];
  }

  public async addComplaint(encounterId: string, input: ComplaintCreateInput) {
    const encounter = await this.getOwnedEncounter(encounterId);
    if (!encounter) return null;

    const inserted = await db
      .insert(complaints)
      .values({
        ...input,
        patientId: encounter.patientId,
        encounterId: encounter.id,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0];
  }

  public async addPhysicalExamination(
    encounterId: string,
    input: PhysicalExaminationCreateInput,
  ) {
    const encounter = await this.getOwnedEncounter(encounterId);
    if (!encounter) return null;

    const inserted = await db
      .insert(physical_examinations)
      .values({
        ...input,
        patientId: encounter.patientId,
        encounterId: encounter.id,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0];
  }

  public async addProvisionalDiagnosis(
    encounterId: string,
    input: ProvisionalDiagnosisCreateInput,
  ) {
    const encounter = await this.getOwnedEncounter(encounterId);
    if (!encounter) return null;

    const inserted = await db
      .insert(provisional_diagnoses)
      .values({
        ...input,
        patientId: encounter.patientId,
        encounterId: encounter.id,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0];
  }

  public async addConfirmDiagnosis(
    encounterId: string,
    input: ConfirmDiagnosisCreateInput,
  ) {
    const encounter = await this.getOwnedEncounter(encounterId);
    if (!encounter) return null;

    const inserted = await db
      .insert(confirm_diagnoses)
      .values({
        ...input,
        patientId: encounter.patientId,
        encounterId: encounter.id,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0];
  }

  public async addTest(encounterId: string, input: TestCreateInput) {
    const encounter = await this.getOwnedEncounter(encounterId);
    if (!encounter) return null;

    const inserted = await db
      .insert(tests)
      .values({
        ...input,
        encounterId: encounter.id,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0];
  }

  public async addTreatment(encounterId: string, input: TreatmentCreateInput) {
    const encounter = await this.getOwnedEncounter(encounterId);
    if (!encounter) return null;

    const inserted = await db
      .insert(treatments)
      .values({
        ...input,
        patientId: encounter.patientId,
        encounterId: encounter.id,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0];
  }

  public async addMedication(
    encounterId: string,
    input: MedicationCreateInput,
  ) {
    const encounter = await this.getOwnedEncounter(encounterId);
    if (!encounter) return null;

    const inserted = await db
      .insert(medications)
      .values({
        ...input,
        patientId: encounter.patientId,
        encounterId: encounter.id,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0];
  }

  public async addDocument(encounterId: string, input: DocumentCreateInput) {
    const encounter = await this.getOwnedEncounter(encounterId);
    if (!encounter) return null;

    const inserted = await db
      .insert(documents)
      .values({
        ...input,
        patientId: encounter.patientId,
        encounterId: encounter.id,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0];
  }
}
