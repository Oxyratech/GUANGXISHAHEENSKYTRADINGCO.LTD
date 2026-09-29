// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as LoggerModule from "@/lib/logger";

const mocks = vi.hoisted(() => ({ create: vi.fn(), getDb: vi.fn(), error: vi.fn() }));

vi.mock("@/server/db", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/logger", async (importOriginal) => ({
  ...(await importOriginal<typeof LoggerModule>()),
  logger: { error: mocks.error, warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { writeAudit } from "./audit";

beforeEach(() => {
  mocks.create.mockReset().mockResolvedValue({});
  mocks.error.mockReset();
  mocks.getDb.mockReset().mockReturnValue({ auditLog: { create: mocks.create } });
});

const written = () => mocks.create.mock.calls[0][0].data;

describe("writeAudit", () => {
  it("writes the entry with an actor snapshot", async () => {
    await writeAudit({
      actor: { id: "u1", email: "admin@example.com" },
      action: "inquiry.status_changed",
      entityType: "inquiry",
      entityId: "abc",
      summary: "NEW -> REVIEWING",
      metadata: { from: "NEW", to: "REVIEWING" },
      ipHash: "a".repeat(64),
    });

    expect(written()).toEqual({
      actorId: "u1",
      actorEmail: "admin@example.com",
      action: "inquiry.status_changed",
      entityType: "inquiry",
      entityId: "abc",
      summary: "NEW -> REVIEWING",
      metadata: JSON.stringify({ from: "NEW", to: "REVIEWING" }),
      ipHash: "a".repeat(64),
    });
  });

  it("stores nulls for anything omitted (unauthenticated events)", async () => {
    await writeAudit({ action: "auth.login_failed", entityType: "user" });

    expect(written()).toEqual({
      actorId: null,
      actorEmail: null,
      action: "auth.login_failed",
      entityType: "user",
      entityId: null,
      summary: null,
      metadata: null,
      ipHash: null,
    });
  });

  it("redacts secrets inside metadata, at any depth", async () => {
    await writeAudit({
      action: "settings.updated",
      entityType: "settings",
      metadata: { password: "hunter2", nested: { apiKey: "k", ok: 1 }, list: [{ token: "t" }] },
    });

    const metadata = JSON.parse(written().metadata);
    expect(metadata).toEqual({
      password: "[REDACTED]",
      nested: { apiKey: "[REDACTED]", ok: 1 },
      list: [{ token: "[REDACTED]" }],
    });
    expect(written().metadata).not.toContain("hunter2");
  });

  it("caps oversize metadata instead of failing", async () => {
    await writeAudit({
      action: "x.y",
      entityType: "x",
      metadata: { blob: "z".repeat(900), more: "z".repeat(900) },
    });
    const small = JSON.parse(written().metadata);
    expect(small).not.toHaveProperty("truncated");

    mocks.create.mockClear();
    const many = Object.fromEntries(
      Array.from({ length: 50 }, (_, i) => [`key${i}`, "v".repeat(900)]),
    );
    await writeAudit({ action: "x.y", entityType: "x", metadata: many });

    expect(written().metadata.length).toBeLessThanOrEqual(4000);
    expect(JSON.parse(written().metadata)).toMatchObject({ truncated: true });
  });

  it("clips fields to their column sizes and drops an ipHash that is not a 64-char hex digest", async () => {
    await writeAudit({
      actor: { id: "u1", email: `${"e".repeat(300)}@x.com` },
      action: "a".repeat(200),
      entityType: "t".repeat(100),
      entityId: "i".repeat(100),
      summary: "s".repeat(900),
      ipHash: "203.0.113.7",
    });

    const data = written();
    expect(data.actorEmail).toHaveLength(254);
    expect(data.action).toHaveLength(100);
    expect(data.entityType).toHaveLength(60);
    expect(data.entityId).toHaveLength(64);
    expect(data.summary).toHaveLength(500);
    expect(data.ipHash).toBeNull();
  });

  it("never throws: database failures are logged, not raised", async () => {
    mocks.create.mockRejectedValue(new Error("db down"));

    await expect(
      writeAudit({ action: "x.y", entityType: "x", entityId: "1" }),
    ).resolves.toBeUndefined();
    expect(mocks.error).toHaveBeenCalledWith(
      "audit.write_failed",
      expect.objectContaining({ action: "x.y", entityType: "x", entityId: "1" }),
    );
  });

  it("never throws when the database is not configured", async () => {
    mocks.getDb.mockImplementation(() => {
      throw new Error("DATABASE_URL is not configured");
    });

    await expect(writeAudit({ action: "x.y", entityType: "x" })).resolves.toBeUndefined();
    expect(mocks.error).toHaveBeenCalledTimes(1);
  });

  it("handles metadata that cannot be serialised", async () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    await expect(
      writeAudit({ action: "x.y", entityType: "x", metadata: cyclic }),
    ).resolves.toBeUndefined();
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
});
