import "server-only";
import { headers } from "next/headers";
import { isIP } from "node:net";
import { hashIp } from "@/server/security/hash";

export interface RequestContext {
  ip: string;
  /** HMAC of the IP: the only form in which an address may be stored or used as a key. */
  ipHash: string;
  userAgent: string | null;
  origin: string | null;
}

const UNKNOWN_IP = "unknown";
const MAX_USER_AGENT_LENGTH = 255;

/** Accepts "1.2.3.4", "1.2.3.4:5678", "::1", "[::1]:443"; returns a bare IP or null. */
function parseIp(candidate: string | null | undefined): string | null {
  const value = candidate?.trim();
  if (!value) return null;
  if (isIP(value)) return value;

  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(value);
  if (bracketed && isIP(bracketed[1])) return bracketed[1];

  // Azure App Service appends the client port to IPv4 addresses.
  const withPort = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(value);
  if (withPort && isIP(withPort[1])) return withPort[1];

  return null;
}

/**
 * Client address as reported by the platform proxy: the first X-Forwarded-For hop, then X-Real-IP.
 * This is only trustworthy when the deployment's proxy overwrites (or strictly appends to) these
 * headers; see docs/SECURITY.md. Malformed values are ignored rather than trusted.
 */
export function getClientIp(requestHeaders: Headers): string {
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0];
  return parseIp(forwarded) ?? parseIp(requestHeaders.get("x-real-ip")) ?? UNKNOWN_IP;
}

export async function getRequestContext(): Promise<RequestContext> {
  const requestHeaders = await headers();
  const ip = getClientIp(requestHeaders);
  const userAgent =
    requestHeaders.get("user-agent")?.trim().slice(0, MAX_USER_AGENT_LENGTH) || null;

  return {
    ip,
    ipHash: hashIp(ip),
    userAgent,
    origin: requestHeaders.get("origin"),
  };
}
