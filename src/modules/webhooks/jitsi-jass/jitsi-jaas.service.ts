import { signJwt } from "../../../utils/jwt";

type JaasUser = {
  id: string;
  name: string;
  email: string;
  moderator: boolean;
};

function getJaasConfig() {
  const appId = process.env.JITSI_JAAS_APP_ID;
  const kid = process.env.JITSI_JAAS_KID;
  const privateKey = process.env.JITSI_JAAS_PRIVATE_KEY;
  if (!appId || !privateKey || !kid) return null;
  const normalizedPrivateKey = privateKey.replace(/\\n/g, "\n");
  return { appId, privateKey: normalizedPrivateKey, kid };
}

export class JitsiJaasService {
  public buildRoomName(appointmentId: string) {
    return `shg-${appointmentId}`;
  }

  public buildMeetingUrl(room: string) {
    const cfg = getJaasConfig();
    if (!cfg) return null;
    return `https://8x8.vc/${cfg.appId}/${room}`;
  }

  /**
   * Short-lived JWT for join links (default 15m). Override with JITSI_JOIN_JWT_EXPIRES_IN.
   */
  public createJoinToken(room: string, user: JaasUser) {
    const ttl = process.env.JITSI_JOIN_JWT_EXPIRES_IN ?? "15m";
    return this.createToken(room, user, ttl);
  }

  public createToken(room: string, user: JaasUser, expiresIn: string = "2h") {
    const cfg = getJaasConfig();
    if (!cfg) return null;

    const payload = {
      aud: "jitsi",
      iss: "chat",
      sub: `${cfg.appId}`,
      room,
      context: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          moderator: user.moderator,
        },
      },
    };

    return signJwt(
      payload,
      {
        algorithm: "RS256",
        expiresIn: expiresIn as any,
        keyid: cfg.kid,
      },
      cfg.privateKey,
    );
  }
}
