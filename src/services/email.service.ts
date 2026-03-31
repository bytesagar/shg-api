import nodemailer from "nodemailer";

type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT
    ? Number(process.env.SMTP_PORT)
    : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !port || !user || !pass || !from) return null;
  return { host, port, user, pass, from };
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private from: string | null = null;

  private ensureTransporter() {
    if (this.transporter) return;
    const cfg = getSmtpConfig();
    console.log(cfg);
    if (!cfg) return;

    this.from = cfg.from;
    this.transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: {
        user: cfg.user,
        pass: cfg.pass,
      },
    });
  }

  public isConfigured() {
    const cfg = getSmtpConfig();
    return !!cfg;
  }

  public async send(
    message: EmailMessage,
  ): Promise<{ sent: boolean; error?: string }> {
    this.ensureTransporter();
    if (!this.transporter || !this.from) {
      const err = "SMTP not configured (missing SMTP_HOST/PORT/USER/PASS/FROM)";
      console.warn(err);
      return { sent: false, error: err };
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
      });
      return { sent: true };
    } catch (e: any) {
      const err = `SMTP send failed: ${e?.message || "unknown error"}`;
      console.warn(err);
      return { sent: false, error: err };
    }
  }
}
