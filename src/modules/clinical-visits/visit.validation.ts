import { z } from "zod";

export const visitCreateSchema = z.object({
  patientId: z.string(),
  date: z.preprocess(
    (val) => (typeof val === "string" ? new Date(val) : val),
    z.date().optional().nullable(),
  ),
  reason: z.string().min(1, "Reason is required"),
  service: z.string().max(255).optional().nullable(),
  status: z
    .enum(["planned", "arrived", "in_progress", "finished", "cancelled"])
    .optional()
    .nullable(),
  doctorId: z.uuid().optional().nullable(),
});

export type VisitCreateInput = z.infer<typeof visitCreateSchema>;

export const visitStatusUpdateSchema = z.object({
  status: z.enum(["finished", "cancelled"]),
});

export type VisitStatusUpdateInput = z.infer<typeof visitStatusUpdateSchema>;

export const vitalsCreateSchema = z.object({
  diastolic: z.number().int().optional().nullable(),
  systolic: z.number().int().optional().nullable(),
  temperature: z.number(),
  pulse: z.number().int().optional().nullable(),
  respiratoryRate: z.number().int(),
  spo2: z.number().int(),
  weight: z.number().optional().nullable(),
  height: z.number().optional().nullable(),
});

export type VitalsCreateInput = z.infer<typeof vitalsCreateSchema>;

export const historyCreateSchema = z.object({
  medical: z.string().min(1),
  surgical: z.string().min(1),
  obGyn: z.string().min(1),
  medication: z.string().min(1),
  familyHistory: z.string().min(1),
  social: z.string().min(1),
  other: z.string().optional().nullable(),
});

export type HistoryCreateInput = z.infer<typeof historyCreateSchema>;

export const complaintCreateSchema = z.object({
  title: z.string().min(1).max(500),
  duration: z.number().int().optional().nullable(),
  durationUnit: z.enum(["hours", "days", "weeks", "months", "years"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  description: z.string().min(1),
});

export type ComplaintCreateInput = z.infer<typeof complaintCreateSchema>;

export const physicalExaminationCreateSchema = z.object({
  generalCondition: z.string().min(1),
  chest: z.string().min(1),
  cvs: z.string().min(1),
  cns: z.string().min(1),
  perabdominal: z.string().min(1),
  localExamination: z.string().min(1),
});

export type PhysicalExaminationCreateInput = z.infer<
  typeof physicalExaminationCreateSchema
>;

export const provisionalDiagnosisCreateSchema = z.object({
  description: z.string().min(1),
});

export type ProvisionalDiagnosisCreateInput = z.infer<
  typeof provisionalDiagnosisCreateSchema
>;

export const confirmDiagnosisCreateSchema = z.object({
  icdCode: z.string().max(50).optional().nullable(),
  description: z.string().min(1),
});

export type ConfirmDiagnosisCreateInput = z.infer<
  typeof confirmDiagnosisCreateSchema
>;

export const testCreateSchema = z.object({
  testName: z.string().min(1).max(255),
  testResult: z.string().optional().nullable(),
  testCategory: z.enum(["lab", "imaging", "other"]),
});

export type TestCreateInput = z.infer<typeof testCreateSchema>;

export const treatmentCreateSchema = z.object({
  medicalAdvise: z.string().optional().nullable(),
  followUpText: z.string().optional().nullable(),
  followUpDate: z.preprocess(
    (val) => (typeof val === "string" ? new Date(val) : val),
    z.date().optional().nullable(),
  ),
  refer: z.string().max(255).optional().nullable(),
  referReason: z.string().optional().nullable(),
});

export type TreatmentCreateInput = z.infer<typeof treatmentCreateSchema>;

export const medicationCreateSchema = z.object({
  type: z.string().max(100).optional().nullable(),
  medicineName: z.string().max(500).optional().nullable(),
  dosage: z.string().max(255).optional().nullable(),
  times: z.string().max(100).optional().nullable(),
  route: z.string().max(100).optional().nullable(),
  beforeAfter: z.string().max(50).optional().nullable(),
  duration: z.string().max(100).optional().nullable(),
  specialNotes: z.string().optional().nullable(),
});

export type MedicationCreateInput = z.infer<typeof medicationCreateSchema>;
