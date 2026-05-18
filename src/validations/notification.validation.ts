import { z } from "zod";
import { createListQuerySchema } from "../utils/query-parser";

export const notificationListQuerySchema = createListQuerySchema({
  unreadOnly: z
    .preprocess((v) => {
      if (v === "true") return true;
      if (v === "false") return false;
      return v;
    }, z.boolean().optional()),
});

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;

export const pusherAuthSchema = z
  .object({
    socket_id: z.string().min(1),
    channel_name: z.string().min(1),
  })
  .strict();

export type PusherAuthInput = z.infer<typeof pusherAuthSchema>;
