import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseUnavailableError } from "@/server/db/errors";
import type { Permission } from "@/server/auth/permissions";
import type { AuthSession } from "@/server/auth/session";

const mocks = vi.hoisted(() => {
  const db = { contactMessage: { count: vi.fn(), findMany: vi.fn(), groupBy: vi.fn() } };
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

import ContactMessagesPage, { metadata } from "./page";

function makeSession(...permissions: Permission[]): AuthSession {
  return {
    sessionId: "s1",
    user: { id: "u1", email: "staff@example.com", name: "Staff" },
    roles: ["SALES_MANAGER"],
    permissions: new Set(permissions),
  };
}

async function renderPage(searchParams: Record<string, string> = {}) {
  render(await ContactMessagesPage({ searchParams: Promise.resolve(searchParams) }));
}

beforeEach(() => {
  mocks.getDb.mockReset().mockReturnValue(mocks.db);
  mocks.db.contactMessage.count.mockReset().mockResolvedValue(0);
  mocks.db.contactMessage.findMany.mockReset().mockResolvedValue([]);
  mocks.db.contactMessage.groupBy.mockReset().mockResolvedValue([]);
  mocks.getSession.mockReset().mockResolvedValue(makeSession("contact:read"));
  mocks.redirect.mockReset().mockImplementation((path: string) => {
    throw new RedirectSignal(path);
  });
});

it("is titled Contact messages", () => {
  expect(metadata.title).toBe("Contact messages");
});

describe("access", () => {
  it("shows the 403 panel to a user without contact:read", async () => {
    mocks.getSession.mockResolvedValue(makeSession("inquiry:read"));

    await renderPage();

    expect(
      screen.getByRole("heading", { name: "You do not have access to this page" }),
    ).toBeInTheDocument();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("shows the outage panel when the database cannot be reached", async () => {
    mocks.db.contactMessage.count.mockRejectedValue(
      new DatabaseUnavailableError("down", { cause: "not_configured" }),
    );

    await renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Contact messages" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Database not configured" })).toBeInTheDocument();
  });
});

describe("empty states", () => {
  it("says honestly that none have arrived yet", async () => {
    await renderPage();

    expect(screen.getByText("No contact messages have been received yet.")).toBeInTheDocument();
  });

  it("says none match once a filter is applied", async () => {
    await renderPage({ q: "nothing-like-this" });

    expect(screen.getByText("No messages match these filters.")).toBeInTheDocument();
  });
});

describe("with data", () => {
  beforeEach(() => {
    mocks.db.contactMessage.groupBy.mockResolvedValue([{ status: "NEW", _count: { _all: 2 } }]);
    mocks.db.contactMessage.count.mockResolvedValue(2);
    mocks.db.contactMessage.findMany.mockResolvedValue([
      {
        id: "c1",
        referenceCode: "CTM-1A2B3C",
        createdAt: new Date("2026-09-29T08:30:00Z"),
        name: "Jane Doe",
        company: "Acme Trading",
        country: "CN",
        status: "NEW",
        handledBy: null,
      },
    ]);
  });

  it("shows the status tabs with real counts", async () => {
    await renderPage();

    const tabs = screen.getByRole("navigation", { name: "Filter messages by status" });
    expect(within(tabs).getByRole("link", { name: /^All/ })).toHaveTextContent("2");
    expect(within(tabs).getByRole("link", { name: /^New/ })).toHaveTextContent("2");
  });

  it("lists the row linking to the message", async () => {
    await renderPage();

    const row = screen.getByRole("row", { name: /CTM-1A2B3C/ });
    expect(within(row).getByRole("link", { name: "CTM-1A2B3C" })).toHaveAttribute(
      "href",
      "/admin/contact-messages/c1",
    );
    expect(row).toHaveTextContent("Jane Doe");
    expect(row).toHaveTextContent("China");
  });
});

describe("database outage while listing", () => {
  it("lets an unrelated error reach the error boundary", async () => {
    mocks.db.contactMessage.count.mockRejectedValue(new TypeError("bug"));

    await expect(ContactMessagesPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("bug");
  });
});
