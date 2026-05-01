import { z } from "zod";
import { isoDateString } from "./common.validation";
import { createListQuerySchema } from "../utils/query-parser";

export const telehealthAppointmentCreateSchema = z.object({
  patientId: z.uuid(),
  doctorId: z.uuid(),
  scheduledAt: isoDateString,
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
  status: appointmentStatusSchema.optional(),
  fromDate: isoDateString.optional(),
  toDate: isoDateString.optional(),
});

export type TelehealthAppointmentsListQuery = z.infer<
  typeof telehealthAppointmentsListQuerySchema
>;
