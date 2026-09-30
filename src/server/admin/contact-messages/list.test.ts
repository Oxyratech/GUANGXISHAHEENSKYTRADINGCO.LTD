// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseUnavailableError } from "@/server/db/errors";
import { parseContactListFilters } from "./filters";

const mocks = vi.hoisted(() => {
  const db = { contactMessage: { count: vi.fn(), findMany: vi.fn(), groupBy: vi.fn() } };
  return { db, getDb: vi.fn(() => db) };
});

vi.mock("@/server/db", () => ({ getDb: mocks.getDb }));

import { listContactMessages } from "./list";

const PAGE = { page: 1, pageSize: 20, skip: 0, take: 20 };

beforeEach(() => {
  mocks.getDb.mockReset().mockReturnValue(mocks.db);
  mocks.db.contactMessage.count.mockReset().mockResolvedValue(0);
  mocks.db.contactMessage.findMany.mockReset().mockResolvedValue([]);
  mocks.db.contactMessage.groupBy.mockReset().mockResolvedValue([]);
});

describe("where clause", () => {
  it("filters by status", async () => {
    await listContactMessages(parseContactListFilters({ status: "NEW" }), PAGE);
    expect(mocks.db.contactMessage.findMany.mock.calls[0][0].where).toEqual({ status: "NEW" });
  });

  it("searches reference code, name, company and email", async () => {
    await listContactMessages(parseContactListFilters({ q: "acme" }), PAGE);
    expect(mocks.db.contactMessage.findMany.mock.calls[0][0].where.OR).toEqual([
      { referenceCode: { contains: "acme" } },
      { name: { contains: "acme" } },
      { company: { contains: "acme" } },
      { email: { contains: "acme" } },
    ]);
  });

  it("never selects the message body or ip hash for the list", async () => {
    await listContactMessages(parseContactListFilters({}), PAGE);
    const select = mocks.db.contactMessage.findMany.mock.calls[0][0].select;
    expect(select).not.toHaveProperty("message");
    expect(select).not.toHaveProperty("ipHash");
  });
});

describe("status tab counts", () => {
  it("counts every status, ignoring the active status filter", async () => {
    mocks.db.contactMessage.groupBy.mockResolvedValue([{ status: "NEW", _count: { _all: 2 } }]);

    const { statusCounts, total } = await listContactMessages(
      parseContactListFilters({ status: "NEW" }),
      PAGE,
    );

    expect(statusCounts).toHaveLength(4);
    expect(mocks.db.contactMessage.groupBy.mock.calls[0][0].where).toEqual({});
    expect(total).toBe(2);
  });
});

describe("sorting", () => {
  it("defaults to newest first and can be reversed", async () => {
    await listContactMessages(parseContactListFilters({}), PAGE);
    expect(mocks.db.contactMessage.findMany.mock.calls[0][0].orderBy).toEqual([
      { createdAt: "desc" },
    ]);

    await listContactMessages(parseContactListFilters({ sort: "oldest" }), PAGE);
    expect(mocks.db.contactMessage.findMany.mock.calls[1][0].orderBy).toEqual([
      { createdAt: "asc" },
    ]);
  });
});

describe("database outage", () => {
  it("normalises a connection failure", async () => {
    mocks.db.contactMessage.count.mockRejectedValue(
      Object.assign(new Error("down"), { code: "ECONNRESET" }),
    );

    await expect(listContactMessages(parseContactListFilters({}), PAGE)).rejects.toBeInstanceOf(
      DatabaseUnavailableError,
    );
  });
});
