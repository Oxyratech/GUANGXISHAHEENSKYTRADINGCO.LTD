// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger, redact } from "./logger";

describe("redact", () => {
  it("replaces values under secret-looking keys, at any depth", () => {
    const result = redact({
      user: "a",
      password: "hunter2",
      nested: {
        apiKey: "k",
        "api-key": "k",
        API_KEY: "k",
        authorization: "Bearer x",
        Cookie: "a=b",
        "set-cookie": "a=b",
        sessionToken: "t",
        clientSecret: "s",
        ok: 1,
      },
      list: [{ token: "t", keep: "yes" }],
    });

    expect(result).toEqual({
      user: "a",
      password: "[REDACTED]",
      nested: {
        apiKey: "[REDACTED]",
        "api-key": "[REDACTED]",
        API_KEY: "[REDACTED]",
        authorization: "[REDACTED]",
        Cookie: "[REDACTED]",
        "set-cookie": "[REDACTED]",
        sessionToken: "[REDACTED]",
        clientSecret: "[REDACTED]",
        ok: 1,
      },
      list: [{ token: "[REDACTED]", keep: "yes" }],
    });
  });

  it("truncates long strings and caps long arrays", () => {
    const result = redact({
      text: "x".repeat(5000),
      items: Array.from({ length: 50 }, (_, i) => i),
    }) as {
      text: string;
      items: unknown[];
    };

    expect(result.text.length).toBeLessThan(1100);
    expect(result.text).toContain("[+4000 chars]");
    expect(result.items).toHaveLength(21);
    expect(result.items.at(-1)).toBe("[+30 more]");
  });

  it("flattens errors without leaking custom secret properties", () => {
    const error = Object.assign(new Error("boom", { cause: new Error("inner") }), {
      code: "E_TEST",
      password: "hunter2",
    });
    const result = redact({ error }) as { error: Record<string, unknown> };

    expect(result.error).toMatchObject({ name: "Error", message: "boom", code: "E_TEST" });
    expect(result.error).not.toHaveProperty("password");
    expect(result.error.cause).toMatchObject({ message: "inner" });
  });

  it("survives circular references, bigint, dates and binary data", () => {
    const circular: Record<string, unknown> = { name: "loop" };
    circular.self = circular;

    const result = redact({
      circular,
      big: 12n,
      at: new Date("2026-01-02T03:04:05.000Z"),
      bytes: new Uint8Array(8),
      fn: () => 1,
    }) as Record<string, unknown>;

    expect(result.circular).toEqual({ name: "loop", self: "[Circular]" });
    expect(result.big).toBe("12");
    expect(result.at).toBe("2026-01-02T03:04:05.000Z");
    expect(result.bytes).toBe("[binary 8 bytes]");
    expect(result).not.toHaveProperty("fn");
  });

  it("does not treat a repeated (non-circular) object as a cycle", () => {
    const shared = { value: 1 };
    expect(redact({ a: shared, b: shared })).toEqual({ a: { value: 1 }, b: { value: 1 } });
  });
});

describe("logger", () => {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const error = vi.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    log.mockClear();
    warn.mockClear();
    error.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is silent under NODE_ENV=test unless LOG_LEVEL is set", () => {
    logger.error("quiet");
    expect(error).not.toHaveBeenCalled();

    vi.stubEnv("LOG_LEVEL", "debug");
    logger.error("loud");
    expect(error).toHaveBeenCalledTimes(1);
  });

  it("writes one redacted JSON line per event to the matching stream", () => {
    vi.stubEnv("LOG_LEVEL", "debug");

    logger.info("auth.login", { email_hash: "abc", password: "hunter2" });
    logger.warn("slow");
    logger.error("failed", { reason: "x" });

    expect(log).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);

    const line = String(log.mock.calls[0][0]);
    expect(line).not.toContain("\n");
    expect(line).not.toContain("hunter2");
    expect(JSON.parse(line)).toMatchObject({
      level: "info",
      event: "auth.login",
      fields: { email_hash: "abc", password: "[REDACTED]" },
    });
    expect(JSON.parse(line).ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(JSON.parse(String(warn.mock.calls[0][0]))).not.toHaveProperty("fields");
  });

  it("honours the LOG_LEVEL threshold", () => {
    vi.stubEnv("LOG_LEVEL", "warn");
    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    expect(log).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);

    vi.stubEnv("LOG_LEVEL", "silent");
    logger.error("e");
    expect(error).not.toHaveBeenCalled();
  });
});
