import { eq } from "drizzle-orm";
import { db } from "../../db";
import { users } from "../../db/schema";
import { RealtimeProvider } from "../../providers/types";
import { PusherProvider } from "../../providers/pusher.provider";
import { RealtimeLogProvider } from "../../providers/realtime-log.provider";
import { EmailService } from "../email/email.service";
import {
  getEventConfig,
  NotificationEvent,
  NotificationEventKind,
} from "./notification.events";
import { NotificationRepository } from "./notification.repository";
import { logger } from "../../utils/logger";

let realtimeSingleton: RealtimeProvider | null = null;
function getRealtimeProvider(): RealtimeProvider {
  if (realtimeSingleton) return realtimeSingleton;
  if (process.env.PUSHER_APP_ID) {
    realtimeSingleton = new PusherProvider();
    logger.info("realtime.provider.selected", { provider: "pusher" });
  } else {
    realtimeSingleton = new RealtimeLogProvider();
    logger.info("realtime.provider.selected", {
      provider: "log",
      reason: "PUSHER_APP_ID_unset",
    });
  }
  return realtimeSingleton;
}

export class NotificationService {
  private readonly repo = new NotificationRepository();
  private readonly realtime: RealtimeProvider;
  private readonly email = new EmailService();

  constructor(private readonly actorUserId?: string) {
    this.realtime = getRealtimeProvider();
  }

  /**
   * Fan out a domain event to inbox, realtime, and (optionally) email.
   * Best-effort: realtime/email failures are logged but do not throw.
   */
  public async publish<K extends NotificationEventKind>(
    event: NotificationEvent<K>,
  ): Promise<void> {
    const cfg = getEventConfig(event.kind);
    const recipients = Array.from(new Set(event.recipientUserIds));

    if (cfg.persist && recipients.length) {
      await this.repo.insertMany(
        recipients.map((userId) => ({
          userId,
          title: cfg.title(event.data),
          description: cfg.description(event.data),
          module: cfg.module,
          moduleId: event.data.moduleId ?? null,
          createdBy: this.actorUserId ?? null,
        })),
      );
    }

    const channels = cfg.channels(event.data, recipients);
    if (channels.length) {
      try {
        await this.realtime.trigger(channels, event.kind, {
          ...event.data,
          kind: event.kind,
        });
      } catch (err) {
        logger.error("notifications.realtime_failed", {
          kind: event.kind,
          channels,
          err,
        });
      }
    }

    if (cfg.email && recipients.length) {
      await this.sendEmails(recipients, cfg.title(event.data), cfg.description(event.data));
    }

    logger.info("notifications.published", {
      kind: event.kind,
      recipientCount: recipients.length,
      channelCount: channels.length,
      persisted: cfg.persist,
      emailed: cfg.email,
    });
  }

  private async sendEmails(
    recipientUserIds: string[],
    subject: string,
    body: string,
  ) {
    const rows = await Promise.all(
      recipientUserIds.map((id) =>
        db
          .select({ id: users.id, email: users.email })
          .from(users)
          .where(eq(users.id, id))
          .limit(1)
          .then((r) => r[0]),
      ),
    );
    for (const row of rows) {
      if (!row?.email) continue;
      try {
        await this.email.send({ to: row.email, subject, body });
      } catch (err) {
        logger.error("notifications.email_failed", {
          userId: row.id,
          err,
        });
      }
    }
  }

  public async listForUser(params: {
    userId: string;
    page: number;
    pageSize: number;
    unreadOnly: boolean;
  }) {
    const { items, total } = await this.repo.listForUser(params);
    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  public async markSeen(id: string, userId: string) {
    return this.repo.markSeen(id, userId);
  }

  public async markAllSeen(userId: string) {
    return this.repo.markAllSeen(userId);
  }
}

export function getRealtime(): RealtimeProvider {
  return getRealtimeProvider();
}
