import { z } from "zod";

const isoDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

const timeString = z
  .string()
  .regex(
    /^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/,
    "Expected HH:mm or HH:mm:ss",
  );

const rosterStatus = z.enum(["active", "inactive"]);

export const rosterCreateSchema = z.object({
  userId: z.uuid(),
  date: isoDateString,
  fromTime: timeString,
  toTime: timeString,
  service: z.string().min(1).max(255),
  status: rosterStatus.optional(),
});

export type RosterCreateInput = z.infer<typeof rosterCreateSchema>;

const rosterEntryRowSchema = z.object({
  date: isoDateString,
  fromTime: timeString,
  toTime: timeString,
  service: z.string().min(1).max(255),
  /** Must match the facility in the JWT when set; omit to use the request facility. */
  facilityId: z.uuid().optional(),
});

export const rosterBatchCreateSchema = z.object({
  userId: z.uuid(),
  status: rosterStatus.optional(),
  entries: z.array(rosterEntryRowSchema).min(1).max(50),
});

export type RosterBatchCreateInput = z.infer<typeof rosterBatchCreateSchema>;

export const rosterUpdateSchema = z.object({
  date: isoDateString.optional(),
  fromTime: timeString.optional(),
  toTime: timeString.optional(),
  service: z.string().min(1).max(255).optional(),
  status: rosterStatus.optional(),
});

export type RosterUpdateInput = z.infer<typeof rosterUpdateSchema>;
