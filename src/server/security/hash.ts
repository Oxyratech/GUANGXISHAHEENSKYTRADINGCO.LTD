import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { isIPv4 } from "node:net";
import { getAuthSecret } from "@/server/env";

export function sha256Hex(input: string | Uint8Array): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Keyed hash (HMAC-SHA-256, hex). Unlike a plain hash it cannot be reversed by enumerating the
 * input space, which matters for IPv4 addresses (only 2^32 candidates). Callers namespace their
 * input (`ip:`, `form:`, `rl:`) so an HMAC minted for one purpose is never valid for another.
 */
export function hmacHex(input: string): string {
  return createHmac("sha256", getAuthSecret()).update(input).digest("hex");
}

const IPV4_MAPPED_PREFIX = "::ffff:";

function canonicalIp(ip: string): string {
  const value = ip.trim().toLowerCase();
  if (value.startsWith(IPV4_MAPPED_PREFIX) && isIPv4(value.slice(IPV4_MAPPED_PREFIX.length))) {
    return value.slice(IPV4_MAPPED_PREFIX.length);
  }
  return value;
}

/** Pseudonymous, stable identifier for an IP address: 64 hex characters, never the address itself. */
export function hashIp(ip: string): string {
  return hmacHex(`ip:${canonicalIp(ip)}`);
}

/** URL-safe random token. The default 32 bytes (256 bits) is what sessions use. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Constant-time string comparison that also hides the length difference. */
export function timingSafeEqualString(a: string, b: string): boolean {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}
