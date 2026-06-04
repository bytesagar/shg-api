import { z } from "zod";
import { isoDateString } from "./common.validation";
import { createListQuerySchema } from "../utils/query-parser";

const isoDateTimeString = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Must be ISO date-time");

export const telehealthAppointmentCreateSchema = z.object({
  patientId: z.uuid(),
  doctorId: z.uuid(),
  // Accepts a full ISO date-time (preferred, carries time-of-day) or a bare
  // `YYYY-MM-DD` for backward compatibility. The service derives the calendar
  // day (for conflict detection) and stores the full instant separately.
  scheduledAt: isoDateTimeString,
  reason: z.string().max(1000).optional().nullable(),
});

export type TelehealthAppointmentCreateInput = z.infer<
  typeof telehealthAppointmentCreateSchema
>;

const appointmentStatusSchema = z.enum([
  "scheduled",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
]);

export const telehealthAppointmentsListQuerySchema = createListQuerySchema({
  patientId: z.uuid().optional(),
  doctorId: z.uuid().optional(),
  assignedDoctorId: z.uuid().optional(),
  status: appointmentStatusSchema.optional(),
  date: isoDateString.optional(),
  fromDate: isoDateString.optional(),
  toDate: isoDateString.optional(),
});

export type TelehealthAppointmentsListQuery = z.infer<
  typeof telehealthAppointmentsListQuerySchema
>;

export const telehealthSessionDurationUpdateSchema = z.object({
  durationSeconds: z.number().int().min(0),
  startedAt: isoDateTimeString.optional().nullable(),
  endedAt: isoDateTimeString.optional().nullable(),
});

export type TelehealthSessionDurationUpdateInput = z.infer<
  typeof telehealthSessionDurationUpdateSchema
>;
