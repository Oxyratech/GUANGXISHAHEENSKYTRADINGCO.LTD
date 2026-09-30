// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseUnavailableError } from "@/server/db/errors";

const mocks = vi.hoisted(() => {
  const db = { user: { findMany: vi.fn() } };
  return { db, getDb: vi.fn(() => db) };
});

vi.mock("@/server/db", () => ({ getDb: mocks.getDb }));

import { listAssignableUsers } from "./assignees";

beforeEach(() => {
  mocks.getDb.mockReset().mockReturnValue(mocks.db);
  mocks.db.user.findMany.mockReset().mockResolvedValue([]);
});

describe("listAssignableUsers", () => {
  it("asks only for active users, ordered by name", async () => {
    await listAssignableUsers();

    expect(mocks.db.user.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    });
  });

  it("returns the rows as given", async () => {
    const rows = [{ id: "u1", name: "Amina", email: "amina@example.com" }];
    mocks.db.user.findMany.mockResolvedValue(rows);

    await expect(listAssignableUsers()).resolves.toEqual(rows);
  });

  it("normalises a connection failure", async () => {
    mocks.db.user.findMany.mockRejectedValue(Object.assign(new Error("x"), { code: "ETIMEDOUT" }));

    await expect(listAssignableUsers()).rejects.toBeInstanceOf(DatabaseUnavailableError);
  });
});
