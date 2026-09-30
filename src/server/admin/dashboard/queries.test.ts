// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseUnavailableError } from "@/server/db/errors";
import type { Permission } from "@/server/auth/permissions";

const mocks = vi.hoisted(() => {
  const db = {
    businessInquiry: { groupBy: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    contactMessage: { groupBy: vi.fn() },
    product: { groupBy: vi.fn() },
    newsArticle: { groupBy: vi.fn() },
    auditLog: { findMany: vi.fn() },
  };
  return { db, getDb: vi.fn(() => db) };
});

vi.mock("@/server/db", () => ({ getDb: mocks.getDb }));

import { loadDashboard, RECENT_AUDIT_LIMIT, RECENT_INQUIRY_LIMIT } from "./queries";

const NOW = new Date("2026-09-30T12:00:00.000Z");
const perms = (...list: Permission[]) => new Set<Permission>(list);
const ALL = perms("inquiry:read", "contact:read", "product:read", "news:read", "audit:read");

function eachMock(callback: (fn: ReturnType<typeof vi.fn>) => void) {
  for (const model of Object.values(mocks.db)) for (const fn of Object.values(model)) callback(fn);
}

beforeEach(() => {
  mocks.getDb.mockReset().mockReturnValue(mocks.db);
  eachMock((fn) => fn.mockReset());
  mocks.db.businessInquiry.groupBy.mockResolvedValue([]);
  mocks.db.businessInquiry.count.mockResolvedValue(0);
  mocks.db.businessInquiry.findMany.mockResolvedValue([]);
  mocks.db.contactMessage.groupBy.mockResolvedValue([]);
  mocks.db.product.groupBy.mockResolvedValue([]);
  mocks.db.newsArticle.groupBy.mockResolvedValue([]);
  mocks.db.auditLog.findMany.mockResolvedValue([]);
});

describe("permission gating", () => {
  it("runs no query at all for a user with none of the data permissions", async () => {
    const data = await loadDashboard(perms("dashboard:read"), NOW);

    expect(data).toEqual({
      inquiries: null,
      contact: null,
      products: null,
      news: null,
      audit: null,
    });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("loads only the sections the user may read", async () => {
    const data = await loadDashboard(perms("contact:read"), NOW);

    expect(data.contact).not.toBeNull();
    expect(data.inquiries).toBeNull();
    expect(data.audit).toBeNull();
    expect(mocks.db.contactMessage.groupBy).toHaveBeenCalledTimes(1);
    expect(mocks.db.businessInquiry.groupBy).not.toHaveBeenCalled();
    expect(mocks.db.auditLog.findMany).not.toHaveBeenCalled();
  });

  it("gives the audit feed only to audit:read", async () => {
    expect((await loadDashboard(perms("inquiry:read"), NOW)).audit).toBeNull();
    expect((await loadDashboard(perms("audit:read"), NOW)).audit).toEqual({ recent: [] });
  });
});

describe("with no data", () => {
  it("reports real zeros for every section, not placeholders", async () => {
    const data = await loadDashboard(ALL, NOW);

    expect(data.inquiries).toMatchObject({
      total: 0,
      newCount: 0,
      receivedLast7Days: 0,
      recent: [],
    });
    expect(data.inquiries?.byStatus).toHaveLength(8);
    expect(data.inquiries?.byStatus.every((entry) => entry.count === 0)).toBe(true);
    expect(data.contact).toEqual({ total: 0, newCount: 0 });
    expect(data.products).toMatchObject({ total: 0 });
    expect(data.news).toEqual({ total: 0, published: 0 });
    expect(data.audit).toEqual({ recent: [] });
  });
});

describe("inquiries", () => {
  it("counts by status in pipeline order and highlights NEW", async () => {
    mocks.db.businessInquiry.groupBy.mockResolvedValue([
      { status: "QUALIFIED", _count: { _all: 2 } },
      { status: "NEW", _count: { _all: 5 } },
    ]);
    mocks.db.businessInquiry.count.mockResolvedValue(4);

    const { inquiries } = await loadDashboard(perms("inquiry:read"), NOW);

    expect(inquiries?.total).toBe(7);
    expect(inquiries?.newCount).toBe(5);
    expect(inquiries?.receivedLast7Days).toBe(4);
    expect(inquiries?.byStatus.map((entry) => entry.status)).toEqual([
      "NEW",
      "REVIEWING",
      "QUALIFIED",
      "QUOTATION",
      "NEGOTIATION",
      "CONFIRMED",
      "COMPLETED",
      "CANCELLED",
    ]);
    expect(inquiries?.byStatus.find((entry) => entry.status === "QUALIFIED")?.count).toBe(2);
    expect(mocks.db.businessInquiry.groupBy).toHaveBeenCalledWith({
      by: ["status"],
      _count: { _all: true },
    });
  });

  it("counts the last seven days from the given moment", async () => {
    await loadDashboard(perms("inquiry:read"), NOW);

    expect(mocks.db.businessInquiry.count).toHaveBeenCalledWith({
      where: { createdAt: { gte: new Date("2026-09-23T12:00:00.000Z") } },
    });
  });

  it("returns the newest eight, selecting only what the table shows", async () => {
    const row = {
      id: "i1",
      referenceCode: "INQ-1",
      company: "Acme",
      country: "CN",
      status: "NEW",
      createdAt: new Date("2026-09-29T00:00:00Z"),
    };
    mocks.db.businessInquiry.findMany.mockResolvedValue([row]);

    const { inquiries } = await loadDashboard(perms("inquiry:read"), NOW);

    expect(inquiries?.recent).toEqual([row]);
    const args = mocks.db.businessInquiry.findMany.mock.calls[0][0];
    expect(args.take).toBe(RECENT_INQUIRY_LIMIT);
    expect(RECENT_INQUIRY_LIMIT).toBe(8);
    expect(args.orderBy).toEqual({ createdAt: "desc" });
    expect(Object.keys(args.select).sort()).toEqual([
      "company",
      "country",
      "createdAt",
      "id",
      "referenceCode",
      "status",
    ]);
    expect(args.select).not.toHaveProperty("ipHash");
    expect(args.select).not.toHaveProperty("email");
    expect(args.select).not.toHaveProperty("specification");
  });
});

describe("contact messages, products and news", () => {
  it("reads contact totals and the NEW count", async () => {
    mocks.db.contactMessage.groupBy.mockResolvedValue([
      { status: "NEW", _count: { _all: 2 } },
      { status: "REPLIED", _count: { _all: 6 } },
    ]);

    expect((await loadDashboard(perms("contact:read"), NOW)).contact).toEqual({
      total: 8,
      newCount: 2,
    });
  });

  it("breaks products down by publish status", async () => {
    mocks.db.product.groupBy.mockResolvedValue([
      { status: "PUBLISHED", _count: { _all: 3 } },
      { status: "DRAFT", _count: { _all: 1 } },
    ]);

    const { products } = await loadDashboard(perms("product:read"), NOW);

    expect(products?.total).toBe(4);
    expect(products?.byStatus).toEqual([
      { status: "DRAFT", count: 1 },
      { status: "PUBLISHED", count: 3 },
      { status: "ARCHIVED", count: 0 },
    ]);
  });

  it("reports published news against the total", async () => {
    mocks.db.newsArticle.groupBy.mockResolvedValue([
      { status: "PUBLISHED", _count: { _all: 2 } },
      { status: "DRAFT", _count: { _all: 5 } },
    ]);

    expect((await loadDashboard(perms("news:read"), NOW)).news).toEqual({
      total: 7,
      published: 2,
    });
  });
});

describe("audit feed", () => {
  it("returns the latest ten with the BIGINT id as a string, and no metadata or IP hash", async () => {
    mocks.db.auditLog.findMany.mockResolvedValue([
      {
        id: BigInt("9007199254740993"),
        actorEmail: "a@example.com",
        action: "inquiry.status_changed",
        entityType: "inquiry",
        entityId: "i1",
        summary: "NEW to REVIEWING",
        createdAt: new Date("2026-09-30T10:00:00Z"),
      },
    ]);

    const { audit } = await loadDashboard(perms("audit:read"), NOW);

    expect(audit?.recent[0].id).toBe("9007199254740993");
    const args = mocks.db.auditLog.findMany.mock.calls[0][0];
    expect(args.take).toBe(RECENT_AUDIT_LIMIT);
    expect(RECENT_AUDIT_LIMIT).toBe(10);
    expect(args.orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
    expect(args.select).not.toHaveProperty("metadata");
    expect(args.select).not.toHaveProperty("ipHash");
  });
});

describe("execution", () => {
  it("starts every section's queries before waiting for any of them", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const later = <T>(value: T) => gate.then(() => value);
    mocks.db.businessInquiry.groupBy.mockReturnValue(later([]));
    mocks.db.businessInquiry.count.mockReturnValue(later(0));
    mocks.db.businessInquiry.findMany.mockReturnValue(later([]));
    mocks.db.contactMessage.groupBy.mockReturnValue(later([]));
    mocks.db.product.groupBy.mockReturnValue(later([]));
    mocks.db.newsArticle.groupBy.mockReturnValue(later([]));
    mocks.db.auditLog.findMany.mockReturnValue(later([]));

    const pending = loadDashboard(ALL, NOW);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Nothing has resolved yet, and still every query is in flight.
    eachMock((fn) => expect(fn).toHaveBeenCalledTimes(1));
    release();
    await pending;
  });

  it("lets a database outage through for the page to render", async () => {
    mocks.getDb.mockImplementation(() => {
      throw new DatabaseUnavailableError("DATABASE_URL is not configured", {
        cause: "not_configured",
      });
    });

    await expect(loadDashboard(perms("inquiry:read"), NOW)).rejects.toBeInstanceOf(
      DatabaseUnavailableError,
    );
  });

  it("lets a connection failure during a query through", async () => {
    mocks.db.product.groupBy.mockRejectedValue(
      new DatabaseUnavailableError("x", { cause: "timeout" }),
    );

    await expect(loadDashboard(perms("product:read"), NOW)).rejects.toMatchObject({
      cause: "timeout",
    });
  });
});
