import { RealtimeAuth, RealtimeProvider } from "./types";

export class RealtimeLogProvider implements RealtimeProvider {
  async trigger(channels: string[], event: string, data: any): Promise<void> {
    console.log(`
==================================================
[MOCK REALTIME EVENT]
Channels: ${channels.join(", ")}
Event:    ${event}
Data:     ${JSON.stringify(data, null, 2)}
==================================================
    `);
  }

  authorize(socketId: string, channel: string): RealtimeAuth {
    return {
      auth: `mock:${socketId}:${channel}`,
    };
  }
}
