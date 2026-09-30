// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseUnavailableError } from "@/server/db/errors";
import { parseInquiryListFilters } from "./filters";

const mocks = vi.hoisted(() => {
  const db = {
    businessInquiry: { count: vi.fn(), findMany: vi.fn(), groupBy: vi.fn() },
  };
  return { db, getDb: vi.fn(() => db) };
});

vi.mock("@/server/db", () => ({ getDb: mocks.getDb }));

import { listInquiries } from "./list";

const PAGE = { page: 1, pageSize: 20, skip: 0, take: 20 };

beforeEach(() => {
  mocks.getDb.mockReset().mockReturnValue(mocks.db);
  mocks.db.businessInquiry.count.mockReset().mockResolvedValue(0);
  mocks.db.businessInquiry.findMany.mockReset().mockResolvedValue([]);
  mocks.db.businessInquiry.groupBy.mockReset().mockResolvedValue([]);
});

describe("where clause", () => {
  it("filters by status, category, country and date range", async () => {
    const filters = parseInquiryListFilters({
      status: "NEW",
      category: "consumer-goods",
      country: "CN",
      from: "2026-01-01",
      to: "2026-01-31",
    });

    await listInquiries(filters, PAGE);

    const where = mocks.db.businessInquiry.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({
      status: "NEW",
      categorySlug: "consumer-goods",
      country: "CN",
      createdAt: {
        gte: new Date("2026-01-01T00:00:00.000Z"),
        lte: new Date("2026-01-31T23:59:59.999Z"),
      },
    });
  });

  it("filters unassigned inquiries with assignedToId: null, and a specific assignee by id", async () => {
    const unassigned = parseInquiryListFilters({ assignee: "unassigned" });
    await listInquiries(unassigned, PAGE);
    expect(mocks.db.businessInquiry.findMany.mock.calls[0][0].where.assignedToId).toBeNull();

    const withAssignee = parseInquiryListFilters({
      assignee: "11111111-1111-1111-1111-111111111111",
    });
    await listInquiries(withAssignee, PAGE);
    expect(mocks.db.businessInquiry.findMany.mock.calls[1][0].where.assignedToId).toBe(
      "11111111-1111-1111-1111-111111111111",
    );
  });

  it("searches reference code, name, company, email and product with OR", async () => {
    const filters = parseInquiryListFilters({ q: "acme" });

    await listInquiries(filters, PAGE);

    const where = mocks.db.businessInquiry.findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([
      { referenceCode: { contains: "acme" } },
      { name: { contains: "acme" } },
      { company: { contains: "acme" } },
      { email: { contains: "acme" } },
      { productName: { contains: "acme" } },
    ]);
  });

  it("never selects internal notes, ip hashes or the raw specification via this query's shape", async () => {
    await listInquiries(parseInquiryListFilters({}), PAGE);

    const args = mocks.db.businessInquiry.findMany.mock.calls[0][0];
    expect(args.select).not.toHaveProperty("notes");
    expect(args.select).not.toHaveProperty("ipHash");
    expect(args.select).not.toHaveProperty("specification");
    expect(args.select).not.toHaveProperty("email");
  });
});

describe("sorting", () => {
  it("sorts newest first by default", async () => {
    await listInquiries(parseInquiryListFilters({}), PAGE);
    expect(mocks.db.businessInquiry.findMany.mock.calls[0][0].orderBy).toEqual([
      { createdAt: "desc" },
    ]);
  });

  it("sorts oldest first", async () => {
    await listInquiries(parseInquiryListFilters({ sort: "oldest" }), PAGE);
    expect(mocks.db.businessInquiry.findMany.mock.calls[0][0].orderBy).toEqual([
      { createdAt: "asc" },
    ]);
  });

  it("sorts by pipeline status order, newest within a status", async () => {
    await listInquiries(parseInquiryListFilters({ sort: "status" }), PAGE);
    expect(mocks.db.businessInquiry.findMany.mock.calls[0][0].orderBy).toEqual([
      { statusRef: { sortOrder: "asc" } },
      { createdAt: "desc" },
    ]);
  });
});

describe("status tab counts", () => {
  it("counts every status regardless of the active status filter, but respects the other filters", async () => {
    mocks.db.businessInquiry.groupBy.mockResolvedValue([
      { status: "NEW", _count: { _all: 3 } },
      { status: "QUALIFIED", _count: { _all: 1 } },
    ]);

    const { statusCounts, total } = await listInquiries(
      parseInquiryListFilters({ status: "NEW", country: "CN" }),
      PAGE,
    );

    expect(statusCounts).toHaveLength(8);
    expect(statusCounts.find((s) => s.status === "NEW")?.count).toBe(3);
    expect(total).toBe(4);

    const countsWhere = mocks.db.businessInquiry.groupBy.mock.calls[0][0].where;
    expect(countsWhere).not.toHaveProperty("status");
    expect(countsWhere).toMatchObject({ country: "CN" });
  });
});

describe("pagination", () => {
  it("uses skip/take from the page params and builds the meta from the total", async () => {
    mocks.db.businessInquiry.count.mockResolvedValue(45);

    const { meta } = await listInquiries(parseInquiryListFilters({}), {
      page: 2,
      pageSize: 20,
      skip: 20,
      take: 20,
    });

    expect(mocks.db.businessInquiry.findMany.mock.calls[0][0].skip).toBe(20);
    expect(mocks.db.businessInquiry.findMany.mock.calls[0][0].take).toBe(20);
    expect(meta).toMatchObject({ total: 45, page: 2, pageCount: 3 });
  });
});

describe("row shape", () => {
  it("flattens the attachment count and keeps the assignee's public fields", async () => {
    mocks.db.businessInquiry.findMany.mockResolvedValue([
      {
        id: "i1",
        referenceCode: "INQ-1",
        createdAt: new Date("2026-06-01T00:00:00Z"),
        name: "Jane",
        company: "Acme",
        country: "CN",
        productName: "Widgets",
        categorySlug: "consumer-goods",
        status: "NEW",
        assignedTo: { id: "u1", name: "Amina" },
        _count: { attachments: 2 },
      },
    ]);

    const { rows } = await listInquiries(parseInquiryListFilters({}), PAGE);

    expect(rows).toEqual([
      {
        id: "i1",
        referenceCode: "INQ-1",
        createdAt: new Date("2026-06-01T00:00:00Z"),
        name: "Jane",
        company: "Acme",
        country: "CN",
        productName: "Widgets",
        categorySlug: "consumer-goods",
        status: "NEW",
        assignedTo: { id: "u1", name: "Amina" },
        attachmentCount: 2,
      },
    ]);
  });
});

describe("database outage", () => {
  it("normalises a connection failure instead of letting a raw driver error through", async () => {
    mocks.db.businessInquiry.count.mockRejectedValue(
      Object.assign(new Error("timeout"), { code: "P1002" }),
    );

    await expect(listInquiries(parseInquiryListFilters({}), PAGE)).rejects.toBeInstanceOf(
      DatabaseUnavailableError,
    );
  });
});
