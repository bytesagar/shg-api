import { db } from "../../db";
import {
  complaints,
  confirm_diagnoses,
  encounters,
  histories,
  medications,
  physical_examinations,
  provisional_diagnoses,
  tests,
  treatments,
  vitals,
} from "../../db/schema";
import { FacilityContext } from "../../context/facility-context";
import { VisitRepository } from "./visit.repository";
import {
  ComplaintCreateInput,
  ConfirmDiagnosisCreateInput,
  HistoryCreateInput,
  MedicationCreateInput,
  PhysicalExaminationCreateInput,
  ProvisionalDiagnosisCreateInput,
  TestCreateInput,
  TestUpdateInput,
  TreatmentCreateInput,
  VitalsCreateInput,
} from "./visit.validation";
import { TestsRepository } from "../tests/tests.repository";
import { and, eq } from "drizzle-orm";

/**
 * URL resource slug → Drizzle table for the generic encounter-update endpoint.
 * Keep keys in sync with `ENCOUNTER_UPDATE_SCHEMAS` in `visit.validation.ts`.
 * `tests` keeps its dedicated route, so it is intentionally omitted here.
 */
const ENCOUNTER_UPDATE_TABLES = {
  complaints,
  "provisional-diagnoses": provisional_diagnoses,
  "confirm-diagnoses": confirm_diagnoses,
  "physical-examinations": physical_examinations,
  histories,
  treatments,
  medications,
} as const;

export class VisitRecordService {
  private visitRepository: VisitRepository;

  constructor(private readonly context: FacilityContext) {
    this.visitRepository = new VisitRepository(context);
  }

  private async getOwnedVisit(visitId: string) {
    const visit = await this.visitRepository.findById(visitId);
    if (!visit || visit.facilityId !== this.context.facilityId) return null;
    return visit;
  }

  private async createEncounter(tx: any, visit: any, encounterType: string) {
    const inserted = await tx
      .insert(encounters)
      .values({
        visitId: visit.id,
        patientId: visit.patientId,
        facilityId: this.context.facilityId,
        encounterAt: new Date(),
        reason: encounterType,
        service: visit.service ?? null,
        status: "finished",
        encounterType,
        doctorId: this.context.userId,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      })
      .returning();
    return inserted[0];
  }

  public async addVitals(visitId: string, input: VitalsCreateInput) {
    const visit = await this.getOwnedVisit(visitId);
    if (!visit) return null;

    return db.transaction(async (tx) => {
      const encounter = await this.createEncounter(tx, visit, "VITALS");
      const inserted = await tx
        .insert(vitals)
        .values({
          ...input,
          visitId: visit.id,
          encounterId: encounter.id,
          createdBy: this.context.userId,
          updatedBy: this.context.userId,
        })
        .returning();
      return { encounter, record: inserted[0] };
    });
  }

  public async addHistory(visitId: string, input: HistoryCreateInput) {
    const visit = await this.getOwnedVisit(visitId);
    if (!visit) return null;

    return db.transaction(async (tx) => {
      const encounter = await this.createEncounter(tx, visit, "HISTORY");
      const inserted = await tx
        .insert(histories)
        .values({
          ...input,
          visitId: visit.id,
          encounterId: encounter.id,
          createdBy: this.context.userId,
          updatedBy: this.context.userId,
        })
        .returning();
      return { encounter, record: inserted[0] };
    });
  }

  public async addComplaint(visitId: string, input: ComplaintCreateInput) {
    const visit = await this.getOwnedVisit(visitId);
    if (!visit) return null;

    return db.transaction(async (tx) => {
      const encounter = await this.createEncounter(tx, visit, "COMPLAINT");
      const inserted = await tx
        .insert(complaints)
        .values({
          ...input,
          patientId: visit.patientId,
          visitId: visit.id,
          encounterId: encounter.id,
          createdBy: this.context.userId,
          updatedBy: this.context.userId,
        })
        .returning();
      return { encounter, record: inserted[0] };
    });
  }

  public async addPhysicalExamination(
    visitId: string,
    input: PhysicalExaminationCreateInput,
  ) {
    const visit = await this.getOwnedVisit(visitId);
    if (!visit) return null;

    return db.transaction(async (tx) => {
      const encounter = await this.createEncounter(
        tx,
        visit,
        "PHYSICAL_EXAMINATION",
      );
      const inserted = await tx
        .insert(physical_examinations)
        .values({
          ...input,
          patientId: visit.patientId,
          visitId: visit.id,
          encounterId: encounter.id,
          createdBy: this.context.userId,
          updatedBy: this.context.userId,
        })
        .returning();
      return { encounter, record: inserted[0] };
    });
  }

  public async addProvisionalDiagnosis(
    visitId: string,
    input: ProvisionalDiagnosisCreateInput,
  ) {
    const visit = await this.getOwnedVisit(visitId);
    if (!visit) return null;

    return db.transaction(async (tx) => {
      const encounter = await this.createEncounter(
        tx,
        visit,
        "PROVISIONAL_DIAGNOSIS",
      );
      const inserted = await tx
        .insert(provisional_diagnoses)
        .values({
          ...input,
          patientId: visit.patientId,
          visitId: visit.id,
          encounterId: encounter.id,
          createdBy: this.context.userId,
          updatedBy: this.context.userId,
        })
        .returning();
      return { encounter, record: inserted[0] };
    });
  }

  public async addConfirmDiagnosis(
    visitId: string,
    input: ConfirmDiagnosisCreateInput,
  ) {
    const visit = await this.getOwnedVisit(visitId);
    if (!visit) return null;

    return db.transaction(async (tx) => {
      const encounter = await this.createEncounter(
        tx,
        visit,
        "CONFIRM_DIAGNOSIS",
      );
      const inserted = await tx
        .insert(confirm_diagnoses)
        .values({
          ...input,
          patientId: visit.patientId,
          visitId: visit.id,
          encounterId: encounter.id,
          createdBy: this.context.userId,
          updatedBy: this.context.userId,
        })
        .returning();
      return { encounter, record: inserted[0] };
    });
  }

  public async addTest(visitId: string, input: TestCreateInput) {
    const visit = await this.getOwnedVisit(visitId);
    if (!visit) return null;

    return db.transaction(async (tx) => {
      const encounter = await this.createEncounter(tx, visit, "TEST");
      const inserted = await tx
        .insert(tests)
        .values({
          ...input,
          visitId: visit.id,
          encounterId: encounter.id,
          createdBy: this.context.userId,
          updatedBy: this.context.userId,
        })
        .returning();
      return { encounter, record: inserted[0] };
    });
  }

  public async updateTest(visitId: string, testId: string, input: TestUpdateInput) {
    // Verify the visit belongs to this facility first.
    const visit = await this.getOwnedVisit(visitId);
    if (!visit) return null;

    const repo = new TestsRepository(this.context);
    return repo.update(testId, input);
  }

  /**
   * Generic update for a visit-scoped encounter detail record. `resource` is the
   * URL slug (e.g. "complaints"); the body has already been validated against
   * the matching schema in the controller. Scoped to the visit (and the visit's
   * facility via `getOwnedVisit`) so records can't be cross-updated.
   */
  public async updateEncounterRecord(
    visitId: string,
    resource: string,
    recordId: string,
    input: Record<string, unknown>,
  ) {
    const visit = await this.getOwnedVisit(visitId);
    if (!visit) return null;

    const table = ENCOUNTER_UPDATE_TABLES[
      resource as keyof typeof ENCOUNTER_UPDATE_TABLES
    ] as any;
    if (!table) return null;

    const updated = await db
      .update(table)
      .set({ ...input, updatedBy: this.context.userId, updatedAt: new Date() })
      .where(and(eq(table.id, recordId), eq(table.visitId, visitId)))
      .returning();
    return updated[0] ?? null;
  }

  public async addTreatment(visitId: string, input: TreatmentCreateInput) {
    const visit = await this.getOwnedVisit(visitId);
    if (!visit) return null;

    return db.transaction(async (tx) => {
      const encounter = await this.createEncounter(tx, visit, "TREATMENT");
      const inserted = await tx
        .insert(treatments)
        .values({
          ...input,
          patientId: visit.patientId,
          visitId: visit.id,
          encounterId: encounter.id,
          createdBy: this.context.userId,
          updatedBy: this.context.userId,
        })
        .returning();
      return { encounter, record: inserted[0] };
    });
  }

  public async addMedication(visitId: string, input: MedicationCreateInput) {
    const visit = await this.getOwnedVisit(visitId);
    if (!visit) return null;

    return db.transaction(async (tx) => {
      const encounter = await this.createEncounter(tx, visit, "MEDICATION");
      const inserted = await tx
        .insert(medications)
        .values({
          ...input,
          patientId: visit.patientId,
          visitId: visit.id,
          encounterId: encounter.id,
          createdBy: this.context.userId,
          updatedBy: this.context.userId,
        })
        .returning();
      return { encounter, record: inserted[0] };
    });
  }
}
