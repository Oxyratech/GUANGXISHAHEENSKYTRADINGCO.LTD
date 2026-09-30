import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseUnavailableError } from "@/server/db/errors";
import type { Permission, RoleKey } from "@/server/auth/permissions";
import type { AuthSession } from "@/server/auth/session";

const mocks = vi.hoisted(() => {
  const db = {
    businessInquiry: { groupBy: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    contactMessage: { groupBy: vi.fn() },
    product: { groupBy: vi.fn() },
    newsArticle: { groupBy: vi.fn() },
    auditLog: { findMany: vi.fn() },
  };
  return {
    db,
    getDb: vi.fn(() => db),
    isDatabaseConfigured: vi.fn(),
    getSession: vi.fn(),
    redirect: vi.fn(),
  };
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
vi.mock("@/server/db", () => ({
  getDb: mocks.getDb,
  isDatabaseConfigured: mocks.isDatabaseConfigured,
}));

import DashboardPage, { metadata } from "./page";

function makeSession(permissions: Permission[], roles: RoleKey[] = ["ADMIN"]): AuthSession {
  return {
    sessionId: "s1",
    user: { id: "u1", email: "amina@example.com", name: "Amina Yusuf" },
    roles,
    permissions: new Set(permissions),
  };
}

const ALL: Permission[] = [
  "dashboard:read",
  "inquiry:read",
  "contact:read",
  "product:read",
  "news:read",
  "audit:read",
];

function resetDb() {
  mocks.db.businessInquiry.groupBy.mockReset().mockResolvedValue([]);
  mocks.db.businessInquiry.count.mockReset().mockResolvedValue(0);
  mocks.db.businessInquiry.findMany.mockReset().mockResolvedValue([]);
  mocks.db.contactMessage.groupBy.mockReset().mockResolvedValue([]);
  mocks.db.product.groupBy.mockReset().mockResolvedValue([]);
  mocks.db.newsArticle.groupBy.mockReset().mockResolvedValue([]);
  mocks.db.auditLog.findMany.mockReset().mockResolvedValue([]);
}

async function renderPage() {
  render(await DashboardPage());
}

beforeEach(() => {
  mocks.getDb.mockReset().mockReturnValue(mocks.db);
  mocks.isDatabaseConfigured.mockReset().mockReturnValue(true);
  mocks.getSession.mockReset().mockResolvedValue(makeSession(ALL));
  mocks.redirect.mockReset().mockImplementation((path: string) => {
    throw new RedirectSignal(path);
  });
  resetDb();
});

describe("access", () => {
  it("sends a visitor without a session to the login page and reads nothing", async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(DashboardPage()).rejects.toThrow(RedirectSignal);
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/login");
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("shows the 403 panel, having read no data, to a user without dashboard:read", async () => {
    mocks.getSession.mockResolvedValue(makeSession(["inquiry:read", "audit:read"]));

    await renderPage();

    expect(
      screen.getByRole("heading", { name: "You do not have access to this page" }),
    ).toBeInTheDocument();
    expect(screen.getByText("dashboard:read")).toBeInTheDocument();
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(screen.queryByText("Recent inquiries")).not.toBeInTheDocument();
  });

  it("reports an outage during the session lookup as an outage, not as a sign-out", async () => {
    mocks.getSession.mockRejectedValue(
      new DatabaseUnavailableError("down", { cause: "connection" }),
    );

    await renderPage();

    expect(
      screen.getByRole("heading", { name: "The database could not be reached" }),
    ).toBeInTheDocument();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("is titled Dashboard", () => {
    expect(metadata.title).toBe("Dashboard");
  });
});

describe("with an empty database", () => {
  it("has one h1 and says honestly that nothing has arrived yet", async () => {
    await renderPage();

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("No inquiries have been received yet.")).toBeInTheDocument();
    expect(screen.getByText("No activity has been recorded yet.")).toBeInTheDocument();
  });

  it("shows real zeros, not placeholders or sample numbers", async () => {
    await renderPage();

    const figures = screen.getByRole("region", { name: "Key figures" });
    expect(within(figures).getByText("New inquiries").closest("div")).toHaveTextContent("0");
    expect(
      within(figures).getByText("Inquiries received, last 7 days").closest("div"),
    ).toHaveTextContent("0");
    expect(within(figures).getByText("New contact messages").closest("div")).toHaveTextContent("0");
    expect(within(figures).getByText("Published news articles").closest("div")).toHaveTextContent(
      "0",
    );

    const inquiryStatuses = screen.getByRole("table", { name: "Inquiries by status" });
    const counts = within(inquiryStatuses)
      .getAllByRole("cell")
      .map((cell) => cell.textContent);
    // Eight statuses and the total row, all of them zero.
    expect(counts).toHaveLength(9);
    expect(counts.every((count) => count === "0")).toBe(true);
  });

  it("lists every inquiry and product status with a count of zero", async () => {
    await renderPage();

    const inquiries = screen.getByRole("table", { name: "Inquiries by status" });
    for (const status of [
      "New",
      "Reviewing",
      "Qualified",
      "Quotation",
      "Negotiation",
      "Confirmed",
      "Completed",
      "Cancelled",
    ]) {
      expect(within(inquiries).getByRole("rowheader", { name: status })).toBeInTheDocument();
    }
    const products = screen.getByRole("table", { name: "Products by status" });
    for (const status of ["Draft", "Published", "Archived"]) {
      expect(within(products).getByRole("rowheader", { name: status })).toBeInTheDocument();
    }
  });

  it("does not highlight the NEW card when there is nothing new", async () => {
    await renderPage();

    const card = screen.getByText("New inquiries").closest("div");
    expect(card?.className).not.toContain("border-gold-400");
  });

  it("gives the tables captions and the recent-inquiries table its columns", async () => {
    await renderPage();

    const table = screen.getByRole("table", { name: "Most recent inquiries" });
    for (const name of ["Reference", "Company", "Country", "Status", "Received"]) {
      expect(within(table).getByRole("columnheader", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("table", { name: "Recent activity" })).toBeInTheDocument();
  });

  it("shows the system facts", async () => {
    await renderPage();

    const system = screen.getByRole("region", { name: "System" });
    expect(system).toHaveTextContent("Configured and reachable");
    expect(system).toHaveTextContent("Amina Yusuf (amina@example.com)");
    expect(system).toHaveTextContent("Admin");
  });
});

describe("with data", () => {
  beforeEach(() => {
    mocks.db.businessInquiry.groupBy.mockResolvedValue([
      { status: "NEW", _count: { _all: 3 } },
      { status: "QUOTATION", _count: { _all: 2 } },
    ]);
    mocks.db.businessInquiry.count.mockResolvedValue(4);
    mocks.db.businessInquiry.findMany.mockResolvedValue([
      {
        id: "0d4f2c1a-0000-4000-8000-00000000000a",
        referenceCode: "INQ-7K3Q9M2X",
        company: "Acme Trading",
        country: "CN",
        status: "NEW",
        createdAt: new Date("2026-09-29T08:30:00Z"),
      },
    ]);
    mocks.db.contactMessage.groupBy.mockResolvedValue([{ status: "NEW", _count: { _all: 2 } }]);
    mocks.db.product.groupBy.mockResolvedValue([{ status: "PUBLISHED", _count: { _all: 5 } }]);
    mocks.db.newsArticle.groupBy.mockResolvedValue([
      { status: "PUBLISHED", _count: { _all: 2 } },
      { status: "DRAFT", _count: { _all: 1 } },
    ]);
    mocks.db.auditLog.findMany.mockResolvedValue([
      {
        id: BigInt(41),
        actorEmail: "amina@example.com",
        action: "inquiry.status_changed",
        entityType: "inquiry",
        entityId: "0d4f2c1a-0000-4000-8000-00000000000a",
        summary: "NEW to REVIEWING",
        createdAt: new Date("2026-09-30T09:00:00Z"),
      },
    ]);
  });

  it("shows the counts from the database and highlights NEW inquiries", async () => {
    await renderPage();

    const figures = screen.getByRole("region", { name: "Key figures" });
    const newCard = within(figures).getByRole("link", { name: "New inquiries" }).closest("div");
    expect(newCard).toHaveTextContent("3");
    expect(newCard?.className).toContain("border-gold-400");
    expect(
      within(figures).getByText("Inquiries received, last 7 days").closest("div"),
    ).toHaveTextContent("4");
    expect(
      within(figures).getByText("Inquiries received, last 7 days").closest("div"),
    ).toHaveTextContent("5 in total");
    expect(within(figures).getByText("New contact messages").closest("div")).toHaveTextContent("2");
    expect(within(figures).getByText("Published news articles").closest("div")).toHaveTextContent(
      "2",
    );
    expect(within(figures).getByText("Published news articles").closest("div")).toHaveTextContent(
      "3 in total, including drafts",
    );
  });

  it("links the NEW inquiries card to the filtered list", async () => {
    await renderPage();

    expect(screen.getByRole("link", { name: "New inquiries" })).toHaveAttribute(
      "href",
      "/admin/inquiries?status=NEW",
    );
  });

  it("breaks inquiries and products down by status", async () => {
    await renderPage();

    const inquiries = screen.getByRole("table", { name: "Inquiries by status" });
    expect(within(inquiries).getByRole("row", { name: /New\s*3/ })).toBeInTheDocument();
    expect(within(inquiries).getByRole("row", { name: /Quotation\s*2/ })).toBeInTheDocument();
    expect(within(inquiries).getByRole("row", { name: /Total\s*5/ })).toBeInTheDocument();
    const products = screen.getByRole("table", { name: "Products by status" });
    expect(within(products).getByRole("row", { name: /Published\s*5/ })).toBeInTheDocument();
  });

  it("lists recent inquiries linking to their pages, with the country named and the time in UTC", async () => {
    await renderPage();

    const table = screen.getByRole("table", { name: "Most recent inquiries" });
    const row = within(table).getByRole("row", { name: /INQ-7K3Q9M2X/ });
    expect(within(row).getByRole("link", { name: "INQ-7K3Q9M2X" })).toHaveAttribute(
      "href",
      "/admin/inquiries/0d4f2c1a-0000-4000-8000-00000000000a",
    );
    expect(row).toHaveTextContent("Acme Trading");
    expect(row).toHaveTextContent("China");
    expect(row).toHaveTextContent("New");
    expect(row).toHaveTextContent("29 Sep 2026, 08:30 UTC");
    expect(screen.queryByText("No inquiries have been received yet.")).not.toBeInTheDocument();
  });

  it("lists recent activity for a user who can read the audit log", async () => {
    await renderPage();

    const table = screen.getByRole("table", { name: "Recent activity" });
    expect(table).toHaveTextContent("amina@example.com");
    expect(table).toHaveTextContent("inquiry.status_changed");
    expect(table).toHaveTextContent("NEW to REVIEWING");
    expect(table).toHaveTextContent("30 Sep 2026, 09:00 UTC");
    expect(screen.getByRole("link", { name: "Full audit log" })).toHaveAttribute(
      "href",
      "/admin/audit-logs",
    );
  });

  it("never renders internal fields", async () => {
    await renderPage();

    expect(document.body.textContent).not.toMatch(/ipHash|userAgent|internal note/i);
  });
});

describe("what each role sees", () => {
  it("shows a sales manager inquiries, contact messages and products, but not news or the audit log", async () => {
    mocks.getSession.mockResolvedValue(
      makeSession(
        ["dashboard:read", "inquiry:read", "contact:read", "product:read"],
        ["SALES_MANAGER"],
      ),
    );

    await renderPage();

    expect(screen.getByText("New inquiries")).toBeInTheDocument();
    expect(screen.getByText("New contact messages")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Products by status" })).toBeInTheDocument();
    expect(screen.queryByText("Published news articles")).not.toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Recent activity" })).not.toBeInTheDocument();
    expect(mocks.db.newsArticle.groupBy).not.toHaveBeenCalled();
    expect(mocks.db.auditLog.findMany).not.toHaveBeenCalled();
  });

  it("shows a content manager products and news, but no inquiry or contact data", async () => {
    mocks.getSession.mockResolvedValue(
      makeSession(["dashboard:read", "product:read", "news:read"], ["CONTENT_MANAGER"]),
    );

    await renderPage();

    expect(screen.getByText("Published news articles")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Products by status" })).toBeInTheDocument();
    expect(screen.queryByText("New inquiries")).not.toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Most recent inquiries" })).not.toBeInTheDocument();
    expect(screen.queryByText("New contact messages")).not.toBeInTheDocument();
    expect(mocks.db.businessInquiry.groupBy).not.toHaveBeenCalled();
    expect(mocks.db.contactMessage.groupBy).not.toHaveBeenCalled();
  });

  it("says so when the role has no data widgets, and still shows the system panel", async () => {
    mocks.getSession.mockResolvedValue(makeSession(["dashboard:read"]));

    await renderPage();

    expect(
      screen.getByRole("heading", { name: "No dashboard figures are available for your role" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "System" })).toBeInTheDocument();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
});

describe("when the database fails while loading the dashboard", () => {
  it("shows the outage panel with the reason instead of crashing or redirecting", async () => {
    mocks.db.businessInquiry.groupBy.mockRejectedValue(
      new DatabaseUnavailableError("down", { cause: "timeout" }),
    );

    await renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "The database took too long to respond" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "System" })).toHaveTextContent(
      "Configured, but not reachable right now",
    );
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(screen.queryByText("No inquiries have been received yet.")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/at .*:\d+:\d+/);
  });

  it("says the database is not configured when that is the reason", async () => {
    mocks.isDatabaseConfigured.mockReturnValue(false);
    mocks.getDb.mockImplementation(() => {
      throw new DatabaseUnavailableError("DATABASE_URL is not configured", {
        cause: "not_configured",
      });
    });

    await renderPage();

    expect(screen.getByRole("heading", { name: "Database not configured" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "System" })).toHaveTextContent(
      "Not configured (DATABASE_URL is missing)",
    );
  });

  it("recognises a raw driver connection failure as an outage", async () => {
    mocks.db.contactMessage.groupBy.mockRejectedValue(
      Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }),
    );

    await renderPage();

    expect(
      screen.getByRole("heading", { name: "The database could not be reached" }),
    ).toBeInTheDocument();
  });

  it("lets other errors reach the error boundary", async () => {
    mocks.db.product.groupBy.mockRejectedValue(new TypeError("bug"));

    await expect(DashboardPage()).rejects.toThrow("bug");
  });
});
