// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseUnavailableError } from "@/server/db/errors";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
  findUnique: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock("@/server/db", async () => ({
  ...(await import("@/server/db/errors")),
  getDb: mocks.getDb,
}));

import { getAuditLogById, listAuditLogs, loadAuditLogFacets } from "./queries";

beforeEach(() => {
  mocks.findMany.mockReset().mockResolvedValue([]);
  mocks.count.mockReset().mockResolvedValue(0);
  mocks.findUnique.mockReset().mockResolvedValue(null);
  mocks.getDb.mockReset().mockReturnValue({
    auditLog: { findMany: mocks.findMany, count: mocks.count, findUnique: mocks.findUnique },
  });
});

describe("listAuditLogs", () => {
  it("builds a where clause from the given filters only", async () => {
    const from = new Date("2026-09-01T00:00:00.000Z");
    const to = new Date("2026-09-30T00:00:00.000Z");

    await listAuditLogs(
      { action: "user.created", entityType: "user", actorEmail: "admin@example.com", from, to },
      { page: 1, pageSize: 30, skip: 0, take: 30 },
    );

    expect(mocks.findMany.mock.calls[0][0].where).toEqual({
      action: "user.created",
      entityType: "user",
      actorEmail: { contains: "admin@example.com" },
      createdAt: { gte: from, lt: to },
    });
  });

  it("applies no filter at all when none are given", async () => {
    await listAuditLogs({}, { page: 1, pageSize: 30, skip: 0, take: 30 });
    expect(mocks.findMany.mock.calls[0][0].where).toEqual({});
  });

  it("converts the BigInt id to a string for every row", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: 42n,
        actorEmail: "a@example.com",
        action: "x",
        entityType: "user",
        entityId: null,
        summary: null,
        createdAt: new Date(),
      },
    ]);
    mocks.count.mockResolvedValue(1);

    const { rows } = await listAuditLogs({}, { page: 1, pageSize: 30, skip: 0, take: 30 });
    expect(rows[0]?.id).toBe("42");
    expect(typeof rows[0]?.id).toBe("string");
  });

  it("reports an unreachable database as DatabaseUnavailableError", async () => {
    mocks.findMany.mockRejectedValue(Object.assign(new Error("down"), { code: "ECONNREFUSED" }));

    await expect(
      listAuditLogs({}, { page: 1, pageSize: 30, skip: 0, take: 30 }),
    ).rejects.toBeInstanceOf(DatabaseUnavailableError);
  });
});

describe("loadAuditLogFacets", () => {
  it("returns the distinct actions and entity types", async () => {
    mocks.findMany
      .mockResolvedValueOnce([{ action: "user.created" }, { action: "user.updated" }])
      .mockResolvedValueOnce([{ entityType: "user" }]);

    await expect(loadAuditLogFacets()).resolves.toEqual({
      actions: ["user.created", "user.updated"],
      entityTypes: ["user"],
    });
  });
});

describe("getAuditLogById", () => {
  it("returns null for an id that is not a valid BigInt", async () => {
    await expect(getAuditLogById("not-a-number")).resolves.toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("returns null when no row matches", async () => {
    mocks.findUnique.mockResolvedValue(null);
    await expect(getAuditLogById("42")).resolves.toBeNull();
  });

  it("returns the full detail, including metadata and ipHash, with the id as a string", async () => {
    mocks.findUnique.mockResolvedValue({
      id: 42n,
      actorEmail: "a@example.com",
      action: "user.created",
      entityType: "user",
      entityId: "u1",
      summary: "Created",
      metadata: '{"roles":["ADMIN"]}',
      ipHash: "f".repeat(64),
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });

    await expect(getAuditLogById("42")).resolves.toMatchObject({
      id: "42",
      ipHash: "f".repeat(64),
      metadata: '{"roles":["ADMIN"]}',
    });
  });
});
