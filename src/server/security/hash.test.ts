// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const secret = vi.hoisted(() => ({ value: "a".repeat(48) }));
vi.mock("@/server/env", () => ({ getAuthSecret: () => secret.value }));

import { hashIp, hmacHex, randomToken, sha256Hex, timingSafeEqualString } from "./hash";

beforeEach(() => {
  secret.value = "a".repeat(48);
});

describe("sha256Hex", () => {
  it("matches the known digest of 'abc'", () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("accepts bytes", () => {
    expect(sha256Hex(new TextEncoder().encode("abc"))).toBe(sha256Hex("abc"));
  });
});

describe("hmacHex", () => {
  it("is deterministic and keyed by the auth secret", () => {
    const first = hmacHex("input");
    expect(hmacHex("input")).toBe(first);
    expect(first).toMatch(/^[0-9a-f]{64}$/);

    secret.value = "b".repeat(48);
    expect(hmacHex("input")).not.toBe(first);
  });
});

describe("hashIp", () => {
  it("returns 64 hex characters and never contains the address", () => {
    const hash = hashIp("203.0.113.7");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain("203");
  });

  it("differs per address and per secret", () => {
    const a = hashIp("203.0.113.7");
    expect(hashIp("203.0.113.8")).not.toBe(a);
    secret.value = "c".repeat(48);
    expect(hashIp("203.0.113.7")).not.toBe(a);
  });

  it("treats an IPv4-mapped IPv6 address and its IPv4 form as the same client", () => {
    expect(hashIp("::ffff:203.0.113.7")).toBe(hashIp("203.0.113.7"));
    expect(hashIp(" 2001:DB8::1 ")).toBe(hashIp("2001:db8::1"));
  });

  it("is namespaced: an IP hash is not the bare HMAC of the address", () => {
    expect(hashIp("203.0.113.7")).not.toBe(hmacHex("203.0.113.7"));
  });
});

describe("randomToken", () => {
  it("is base64url and long enough by default", () => {
    const token = randomToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token).toHaveLength(43);
    expect(randomToken()).not.toBe(token);
  });

  it("honours the byte length", () => {
    expect(randomToken(16)).toHaveLength(22);
  });
});

describe("timingSafeEqualString", () => {
  it("compares equal and unequal strings, including different lengths", () => {
    expect(timingSafeEqualString("abc", "abc")).toBe(true);
    expect(timingSafeEqualString("abc", "abd")).toBe(false);
    expect(timingSafeEqualString("abc", "abcd")).toBe(false);
    expect(timingSafeEqualString("", "")).toBe(true);
  });
});
