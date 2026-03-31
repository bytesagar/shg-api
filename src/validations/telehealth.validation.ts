import { z } from "zod";

export const telehealthAppointmentCreateSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  scheduledAt: z.preprocess(
    (val) => (typeof val === "string" ? new Date(val) : val),
    z.date(),
  ),
  reason: z.string().max(1000).optional().nullable(),
});

export type TelehealthAppointmentCreateInput = z.infer<
  typeof telehealthAppointmentCreateSchema
>;
