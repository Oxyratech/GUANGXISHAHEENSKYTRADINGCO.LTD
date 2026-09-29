// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/env", () => ({ getAuthSecret: () => "k".repeat(48) }));

import {
  ABSOLUTE_TIMEOUT_MS,
  IDLE_TIMEOUT_MS,
  TOUCH_INTERVAL_MS,
  evaluateSession,
  hashSessionToken,
} from "./session-policy";

const HOUR = 60 * 60 * 1000;
const NOW = new Date("2026-06-18T12:00:00.000Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const ahead = (ms: number) => new Date(NOW.getTime() + ms);

describe("session lifetimes", () => {
  it("are 8 hours idle, 7 days absolute, refreshed at most every 5 minutes", () => {
    expect(IDLE_TIMEOUT_MS).toBe(8 * HOUR);
    expect(ABSOLUTE_TIMEOUT_MS).toBe(7 * 24 * HOUR);
    expect(TOUCH_INTERVAL_MS).toBe(5 * 60 * 1000);
  });
});

describe("hashSessionToken", () => {
  it("is the SHA-256 hex of the token, so the raw token is not recoverable from storage", () => {
    expect(hashSessionToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(hashSessionToken("abc")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSessionToken("abc")).not.toBe(hashSessionToken("abd"));
  });
});

describe("evaluateSession", () => {
  it("accepts an active session without touching it when it was used moments ago", () => {
    expect(evaluateSession({ now: NOW, expiresAt: ahead(HOUR), lastUsedAt: ago(60_000) })).toEqual({
      state: "valid",
      shouldTouch: false,
    });
  });

  it("asks for a touch once lastUsedAt is 5 minutes old, not before", () => {
    const at = (age: number) =>
      evaluateSession({ now: NOW, expiresAt: ahead(HOUR), lastUsedAt: ago(age) });

    expect(at(TOUCH_INTERVAL_MS - 1)).toEqual({ state: "valid", shouldTouch: false });
    expect(at(TOUCH_INTERVAL_MS)).toEqual({ state: "valid", shouldTouch: true });
  });

  it("expires after 8 idle hours, even well inside the absolute limit", () => {
    const at = (age: number) =>
      evaluateSession({ now: NOW, expiresAt: ahead(5 * 24 * HOUR), lastUsedAt: ago(age) });

    expect(at(IDLE_TIMEOUT_MS - 1).state).toBe("valid");
    expect(at(IDLE_TIMEOUT_MS)).toEqual({ state: "idle_expired" });
  });

  it("expires at the absolute limit however recently it was used", () => {
    expect(evaluateSession({ now: NOW, expiresAt: NOW, lastUsedAt: ago(1000) })).toEqual({
      state: "expired",
    });
    expect(evaluateSession({ now: NOW, expiresAt: ago(1), lastUsedAt: ago(1000) })).toEqual({
      state: "expired",
    });
    expect(evaluateSession({ now: NOW, expiresAt: ahead(1), lastUsedAt: ago(1000) }).state).toBe(
      "valid",
    );
  });

  it("reports absolute expiry ahead of idle expiry when both apply", () => {
    expect(
      evaluateSession({ now: NOW, expiresAt: ago(1), lastUsedAt: ago(IDLE_TIMEOUT_MS * 2) }),
    ).toEqual({
      state: "expired",
    });
  });
});
