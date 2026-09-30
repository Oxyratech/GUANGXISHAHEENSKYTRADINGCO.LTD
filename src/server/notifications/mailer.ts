import "server-only";
import { createTransport, type Transporter } from "nodemailer";
import { getEnv } from "@/server/env";

export interface MailConfig {
  host: string;
  port: number;
  user?: string;
  password?: string;
  from: string;
  /** The company inbox that receives the notification. */
  to: string;
}

/**
 * SMTP settings from the environment, or null when notifications are not configured. Mail is
 * optional: without SMTP_HOST, SMTP_FROM and INQUIRY_NOTIFY_EMAIL nothing is sent and nothing is
 * pretended.
 */
export function readMailConfig(): MailConfig | null {
  const env = getEnv();
  if (!env.SMTP_HOST || !env.SMTP_FROM || !env.INQUIRY_NOTIFY_EMAIL) return null;
  return {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
    from: env.SMTP_FROM,
    to: env.INQUIRY_NOTIFY_EMAIL,
  };
}

const CONNECTION_TIMEOUT_MS = 10_000;
const SOCKET_TIMEOUT_MS = 20_000;

let cached: { key: string; transporter: Transporter } | undefined;

/** One transporter per distinct configuration, reused across submissions. */
function transporterFor(config: MailConfig): Transporter {
  const key = [config.host, config.port, config.user ?? ""].join("|");
  if (cached?.key === key) return cached.transporter;

  const transporter = createTransport({
    host: config.host,
    port: config.port,
    // Port 465 speaks TLS from the first byte; the others upgrade with STARTTLS when offered.
    secure: config.port === 465,
    ...(config.user && config.password
      ? { auth: { user: config.user, pass: config.password } }
      : {}),
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    greetingTimeout: CONNECTION_TIMEOUT_MS,
    socketTimeout: SOCKET_TIMEOUT_MS,
  });
  cached = { key, transporter };
  return transporter;
}

export interface OutgoingMail {
  subject: string;
  text: string;
  html: string;
  /** The sender's own address, so that replying reaches them. Already validated as an e-mail. */
  replyTo: string;
}

export async function sendMail(config: MailConfig, mail: OutgoingMail): Promise<void> {
  await transporterFor(config).sendMail({
    from: config.from,
    to: config.to,
    replyTo: mail.replyTo,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
}
