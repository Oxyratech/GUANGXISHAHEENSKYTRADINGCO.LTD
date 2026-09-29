import "server-only";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { logger } from "@/lib/logger";

/**
 * Environment access. Everything is read lazily, on call, so importing this module (and therefore
 * building the app) never requires — or throws over — configuration.
 *
 * Empty strings count as unset. An invalid optional value is ignored with a one-time warning that
 * names the variable (never its value): a typo in CONTACT_EMAIL must not take the site down.
 * AUTH_SECRET is the exception, see getAuthSecret().
 */

const DEFAULT_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
/** Stays below next.config `serverActions.bodySizeLimit` (8mb) so multipart overhead still fits. */
const UPLOAD_MAX_BYTES_CEILING = 7 * 1024 * 1024;
const AUTH_SECRET_MIN_LENGTH = 32;

export interface Env {
  DATABASE_URL: string | undefined;
  AUTH_SECRET: string | undefined;
  SMTP_HOST: string | undefined;
  SMTP_PORT: number;
  SMTP_USER: string | undefined;
  SMTP_PASSWORD: string | undefined;
  SMTP_FROM: string | undefined;
  INQUIRY_NOTIFY_EMAIL: string | undefined;
  UPLOAD_MAX_BYTES: number;
  CONTACT_EMAIL: string | undefined;
  CONTACT_PHONE: string | undefined;
  CONTACT_WHATSAPP: string | undefined;
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN: string | undefined;
  SEED_ADMIN_EMAIL: string | undefined;
  SEED_ADMIN_PASSWORD: string | undefined;
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

const text = (max: number) => z.string().min(1).max(max);
const email = z.email().max(254);
const port = z.coerce.number().int().min(1).max(65535);
const uploadBytes = z.coerce.number().int().min(1024).max(UPLOAD_MAX_BYTES_CEILING);
const hostname = z.string().regex(/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i);

const warnedInvalid = new Set<string>();

function read<T>(name: string, schema: z.ZodType<T>): T | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;

  const parsed = schema.safeParse(raw);
  if (parsed.success) return parsed.data;

  if (!warnedInvalid.has(name)) {
    warnedInvalid.add(name);
    logger.warn("env.invalid_value_ignored", { variable: name });
  }
  return undefined;
}

export function getEnv(): Env {
  return {
    DATABASE_URL: read("DATABASE_URL", text(2000)),
    AUTH_SECRET: read("AUTH_SECRET", text(500)),
    SMTP_HOST: read("SMTP_HOST", text(255)),
    SMTP_PORT: read("SMTP_PORT", port) ?? 587,
    SMTP_USER: read("SMTP_USER", text(255)),
    SMTP_PASSWORD: read("SMTP_PASSWORD", text(500)),
    SMTP_FROM: read("SMTP_FROM", text(320)),
    INQUIRY_NOTIFY_EMAIL: read("INQUIRY_NOTIFY_EMAIL", email),
    UPLOAD_MAX_BYTES: read("UPLOAD_MAX_BYTES", uploadBytes) ?? DEFAULT_UPLOAD_MAX_BYTES,
    CONTACT_EMAIL: read("CONTACT_EMAIL", email),
    CONTACT_PHONE: read("CONTACT_PHONE", text(40)),
    CONTACT_WHATSAPP: read("CONTACT_WHATSAPP", text(40)),
    NEXT_PUBLIC_PLAUSIBLE_DOMAIN: read("NEXT_PUBLIC_PLAUSIBLE_DOMAIN", hostname),
    SEED_ADMIN_EMAIL: read("SEED_ADMIN_EMAIL", email),
    SEED_ADMIN_PASSWORD: read("SEED_ADMIN_PASSWORD", text(500)),
  };
}

// Kept on globalThis so that hot reloads and duplicated module instances within one process
// (route handlers and server actions may be bundled separately) share the same throwaway secret.
const globalForSecret = globalThis as unknown as {
  __shaheenEphemeralSecret?: string;
  __shaheenEphemeralSecretWarned?: boolean;
};

/**
 * Secret that keys every HMAC (IP hashes, form tokens, rate-limit keys). Rotating it invalidates
 * outstanding form tokens and changes IP hashes; it does not affect sessions (those are random
 * tokens stored as plain SHA-256).
 *
 * Production: throws ConfigurationError unless AUTH_SECRET holds at least 32 characters. Elsewhere a
 * random per-process secret is used and a single warning logged. There is never a fixed fallback.
 */
export function getAuthSecret(): string {
  const configured = process.env.AUTH_SECRET?.trim();
  if (configured && configured.length >= AUTH_SECRET_MIN_LENGTH) return configured;

  if (process.env.NODE_ENV === "production") {
    throw new ConfigurationError(
      configured
        ? `AUTH_SECRET must be at least ${AUTH_SECRET_MIN_LENGTH} characters`
        : "AUTH_SECRET is required in production",
    );
  }

  if (!globalForSecret.__shaheenEphemeralSecretWarned) {
    globalForSecret.__shaheenEphemeralSecretWarned = true;
    logger.warn("env.auth_secret_ephemeral", {
      reason: configured ? "too_short" : "missing",
      effect: "form tokens and IP hashes will not survive a restart",
    });
  }
  globalForSecret.__shaheenEphemeralSecret ??= randomBytes(48).toString("base64url");
  return globalForSecret.__shaheenEphemeralSecret;
}
