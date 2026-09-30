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

import { countOtherActiveSuperAdmins, getUserById, listUsers, toRoleKeys } from "./queries";

beforeEach(() => {
  mocks.findMany.mockReset().mockResolvedValue([]);
  mocks.count.mockReset().mockResolvedValue(0);
  mocks.findUnique.mockReset().mockResolvedValue(null);
  mocks.getDb.mockReset().mockReturnValue({
    user: { findMany: mocks.findMany, count: mocks.count, findUnique: mocks.findUnique },
  });
});

describe("toRoleKeys", () => {
  it("orders roles by the fixed ROLE_KEYS order, regardless of input order", () => {
    expect(
      toRoleKeys([{ role: { key: "SALES_MANAGER" } }, { role: { key: "SUPER_ADMIN" } }]),
    ).toEqual(["SUPER_ADMIN", "SALES_MANAGER"]);
  });

  it("drops keys that are not a known role", () => {
    expect(toRoleKeys([{ role: { key: "GHOST_ROLE" } }, { role: { key: "ADMIN" } }])).toEqual([
      "ADMIN",
    ]);
  });
});

describe("listUsers", () => {
  it("builds a search filter across name and email, and an active/role filter", async () => {
    await listUsers(
      { search: "jane", role: "SALES_MANAGER", active: true },
      { page: 1, pageSize: 20, skip: 0, take: 20 },
    );

    expect(mocks.findMany.mock.calls[0][0].where).toEqual({
      OR: [{ name: { contains: "jane" } }, { email: { contains: "jane" } }],
      isActive: true,
      roles: { some: { role: { key: "SALES_MANAGER" } } },
    });
  });

  it("returns rows with roles sorted, and the total count", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: "u1",
        name: "Jane",
        email: "jane@example.com",
        isActive: true,
        lockedUntil: null,
        lastLoginAt: null,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        roles: [{ role: { key: "SALES_MANAGER" } }],
      },
    ]);
    mocks.count.mockResolvedValue(1);

    const result = await listUsers({}, { page: 1, pageSize: 20, skip: 0, take: 20 });

    expect(result).toEqual({
      total: 1,
      rows: [expect.objectContaining({ id: "u1", roles: ["SALES_MANAGER"] })],
    });
  });

  it("reports an unreachable database as DatabaseUnavailableError", async () => {
    mocks.findMany.mockRejectedValue(Object.assign(new Error("down"), { code: "ECONNREFUSED" }));

    await expect(
      listUsers({}, { page: 1, pageSize: 20, skip: 0, take: 20 }),
    ).rejects.toBeInstanceOf(DatabaseUnavailableError);
  });
});

describe("getUserById", () => {
  it("returns null for a user that does not exist", async () => {
    mocks.findUnique.mockResolvedValue(null);

    await expect(getUserById("missing")).resolves.toBeNull();
  });

  it("shapes the detail row, including the session count", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "u1",
      name: "Jane",
      email: "jane@example.com",
      isActive: true,
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-02T00:00:00Z"),
      roles: [{ role: { key: "ADMIN" } }],
      _count: { sessions: 2 },
    });

    await expect(getUserById("u1")).resolves.toMatchObject({
      id: "u1",
      roles: ["ADMIN"],
      sessionCount: 2,
    });
  });
});

describe("countOtherActiveSuperAdmins", () => {
  it("excludes the given user and counts only active Super Admins", async () => {
    mocks.getDb.mockReturnValue({ user: { count: mocks.count } });
    mocks.count.mockResolvedValue(2);

    await expect(countOtherActiveSuperAdmins("u1")).resolves.toBe(2);
    expect(mocks.count).toHaveBeenCalledWith({
      where: {
        id: { not: "u1" },
        isActive: true,
        roles: { some: { role: { key: "SUPER_ADMIN" } } },
      },
    });
  });
});
