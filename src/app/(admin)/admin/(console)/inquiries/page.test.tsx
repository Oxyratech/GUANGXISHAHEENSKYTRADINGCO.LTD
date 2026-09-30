import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseUnavailableError } from "@/server/db/errors";
import type { Permission } from "@/server/auth/permissions";
import type { AuthSession } from "@/server/auth/session";

const mocks = vi.hoisted(() => {
  const db = {
    businessInquiry: { count: vi.fn(), findMany: vi.fn(), groupBy: vi.fn() },
    user: { findMany: vi.fn() },
  };
  return { db, getDb: vi.fn(() => db), getSession: vi.fn(), redirect: vi.fn() };
});

class RedirectSignal extends Error {}

vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/ui/test-utils")).navigationMock,
);
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/server/auth/session", () => ({ getSession: mocks.getSession }));
vi.mock("@/server/db", () => ({ getDb: mocks.getDb }));

import InquiriesPage, { metadata } from "./page";

function makeSession(...permissions: Permission[]): AuthSession {
  return {
    sessionId: "s1",
    user: { id: "u1", email: "staff@example.com", name: "Staff" },
    roles: ["SALES_MANAGER"],
    permissions: new Set(permissions),
  };
}

async function renderPage(searchParams: Record<string, string> = {}) {
  render(await InquiriesPage({ searchParams: Promise.resolve(searchParams) }));
}

beforeEach(() => {
  mocks.getDb.mockReset().mockReturnValue(mocks.db);
  mocks.db.businessInquiry.count.mockReset().mockResolvedValue(0);
  mocks.db.businessInquiry.findMany.mockReset().mockResolvedValue([]);
  mocks.db.businessInquiry.groupBy.mockReset().mockResolvedValue([]);
  mocks.db.user.findMany.mockReset().mockResolvedValue([]);
  mocks.getSession.mockReset().mockResolvedValue(makeSession("inquiry:read"));
  mocks.redirect.mockReset().mockImplementation((path: string) => {
    throw new RedirectSignal(path);
  });
});

it("is titled Inquiries", () => {
  expect(metadata.title).toBe("Inquiries");
});

describe("access", () => {
  it("sends a visitor without a session to the login page and reads nothing", async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(InquiriesPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      RedirectSignal,
    );
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("shows the 403 panel to a user without inquiry:read", async () => {
    mocks.getSession.mockResolvedValue(makeSession("contact:read"));

    await renderPage();

    expect(
      screen.getByRole("heading", { name: "You do not have access to this page" }),
    ).toBeInTheDocument();
    expect(screen.getByText("inquiry:read")).toBeInTheDocument();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("shows the outage panel when the database cannot be reached", async () => {
    mocks.db.businessInquiry.count.mockRejectedValue(
      new DatabaseUnavailableError("down", { cause: "connection" }),
    );

    await renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Inquiries" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "The database could not be reached" }),
    ).toBeInTheDocument();
  });
});

describe("empty states", () => {
  it("says honestly that none have arrived yet, with no filters applied", async () => {
    await renderPage();

    expect(screen.getByText("No inquiries have been received yet.")).toBeInTheDocument();
  });

  it("says none match, with a reset link, once a filter is applied", async () => {
    await renderPage({ q: "nothing-like-this" });

    expect(screen.getByText("No inquiries match these filters.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reset filters" })).toHaveAttribute(
      "href",
      "/admin/inquiries",
    );
  });
});

describe("with data", () => {
  beforeEach(() => {
    mocks.db.businessInquiry.groupBy.mockResolvedValue([
      { status: "NEW", _count: { _all: 3 } },
      { status: "QUOTATION", _count: { _all: 1 } },
    ]);
    mocks.db.businessInquiry.count.mockResolvedValue(4);
    mocks.db.businessInquiry.findMany.mockResolvedValue([
      {
        id: "0d4f2c1a-0000-4000-8000-00000000000a",
        referenceCode: "INQ-7K3Q9M2X",
        createdAt: new Date("2026-09-29T08:30:00Z"),
        name: "Jane Doe",
        company: "Acme Trading",
        country: "CN",
        productName: "Widgets",
        categorySlug: "consumer-goods",
        status: "NEW",
        assignedTo: { id: "u2", name: "Amina Yusuf" },
        _count: { attachments: 2 },
      },
    ]);
  });

  it("shows the status tabs with real counts, including All", async () => {
    await renderPage();

    const tabs = screen.getByRole("navigation", { name: "Filter inquiries by status" });
    expect(within(tabs).getByRole("link", { name: /^All/ })).toHaveTextContent("4");
    expect(within(tabs).getByRole("link", { name: /^New/ })).toHaveTextContent("3");
    expect(within(tabs).getByRole("link", { name: /^Quotation/ })).toHaveTextContent("1");
  });

  it("lists the row with the reference link, country name, category, assignee and attachment count", async () => {
    await renderPage();

    const row = screen.getByRole("row", { name: /INQ-7K3Q9M2X/ });
    expect(within(row).getByRole("link", { name: "INQ-7K3Q9M2X" })).toHaveAttribute(
      "href",
      "/admin/inquiries/0d4f2c1a-0000-4000-8000-00000000000a",
    );
    expect(row).toHaveTextContent("Acme Trading");
    expect(row).toHaveTextContent("China");
    expect(row).toHaveTextContent("Consumer goods");
    expect(row).toHaveTextContent("Amina Yusuf");
    expect(row).toHaveTextContent("2");
    expect(screen.queryByText("No inquiries have been received yet.")).not.toBeInTheDocument();
  });

  it("shows the pagination summary", async () => {
    await renderPage();

    expect(screen.getByText(/Showing 1.4 of 4 inquiries/)).toBeInTheDocument();
  });
});

describe("filters reach the query", () => {
  it("translates the status tab, category, country and date range into the list query", async () => {
    await renderPage({
      status: "new",
      category: "consumer-goods",
      country: "cn",
      from: "2026-01-01",
      to: "2026-01-31",
    });

    const where = mocks.db.businessInquiry.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ status: "NEW", categorySlug: "consumer-goods", country: "CN" });
  });
});

describe("database outage while listing", () => {
  it("lets an unrelated error reach the error boundary", async () => {
    mocks.db.businessInquiry.count.mockRejectedValue(new TypeError("bug"));

    await expect(InquiriesPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("bug");
  });
});
