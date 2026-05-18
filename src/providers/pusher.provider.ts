import Pusher from "pusher";
import { RealtimeAuth, RealtimeProvider } from "./types";

export class PusherProvider implements RealtimeProvider {
  private client: Pusher;

  constructor() {
    const appId = process.env.PUSHER_APP_ID;
    const key = process.env.PUSHER_KEY;
    const secret = process.env.PUSHER_SECRET;
    const cluster = process.env.PUSHER_CLUSTER;
    if (!appId || !key || !secret || !cluster) {
      throw new Error(
        "PUSHER_APP_ID/KEY/SECRET/CLUSTER must be set to use PusherProvider",
      );
    }
    this.client = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: process.env.PUSHER_USE_TLS !== "false",
    });
  }

  async trigger(channels: string[], event: string, data: any): Promise<void> {
    if (!channels.length) return;
    try {
      await this.client.trigger(channels, event, data);
    } catch (err) {
      // Re-throw so caller (NotificationService) can log with its own context.
      throw err;
    }
  }

  authorize(socketId: string, channel: string, userData?: any): RealtimeAuth {
    if (channel.startsWith("presence-") && userData) {
      return this.client.authorizeChannel(socketId, channel, {
        user_id: userData.user_id ?? userData.id,
        user_info: userData,
      }) as RealtimeAuth;
    }
    return this.client.authorizeChannel(socketId, channel) as RealtimeAuth;
  }
}
