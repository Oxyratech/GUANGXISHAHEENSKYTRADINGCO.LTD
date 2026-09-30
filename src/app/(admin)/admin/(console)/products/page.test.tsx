import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseUnavailableError } from "@/server/db/errors";
import type { Permission } from "@/server/auth/permissions";
import type { AuthSession } from "@/server/auth/session";

const mocks = vi.hoisted(() => {
  const db = { product: { count: vi.fn(), findMany: vi.fn() } };
  return { db, getDb: vi.fn(() => db), getSession: vi.fn(), redirect: vi.fn() };
});

class RedirectSignal extends Error {}

vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/ui/test-utils")).navigationMock,
);
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/server/auth/session", () => ({ getSession: mocks.getSession }));
vi.mock("@/server/db", () => ({ getDb: mocks.getDb }));

import ProductsPage, { metadata } from "./page";

function makeSession(...permissions: Permission[]): AuthSession {
  return {
    sessionId: "s1",
    user: { id: "u1", email: "staff@example.com", name: "Staff" },
    roles: ["CONTENT_MANAGER"],
    permissions: new Set(permissions),
  };
}

async function renderPage(searchParams: Record<string, string> = {}) {
  render(await ProductsPage({ searchParams: Promise.resolve(searchParams) }));
}

beforeEach(() => {
  mocks.getDb.mockReset().mockReturnValue(mocks.db);
  mocks.db.product.count.mockReset().mockResolvedValue(0);
  mocks.db.product.findMany.mockReset().mockResolvedValue([]);
  mocks.getSession.mockReset().mockResolvedValue(makeSession("product:read"));
  mocks.redirect.mockReset().mockImplementation((path: string) => {
    throw new RedirectSignal(path);
  });
});

it("is titled Products", () => {
  expect(metadata.title).toBe("Products");
});

describe("access", () => {
  it("sends a visitor without a session to login and reads nothing", async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(ProductsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      RedirectSignal,
    );
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("shows the 403 panel to a user without product:read", async () => {
    mocks.getSession.mockResolvedValue(makeSession("inquiry:read"));
    await renderPage();
    expect(
      screen.getByRole("heading", { name: "You do not have access to this page" }),
    ).toBeInTheDocument();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("shows the outage panel when the database cannot be reached", async () => {
    mocks.db.product.count.mockRejectedValue(
      new DatabaseUnavailableError("down", { cause: "connection" }),
    );
    await renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Products" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "The database could not be reached" }),
    ).toBeInTheDocument();
  });
});

describe("the New product button", () => {
  it("is shown to a user with product:write", async () => {
    mocks.getSession.mockResolvedValue(makeSession("product:read", "product:write"));
    await renderPage();
    expect(screen.getByRole("link", { name: "New product" })).toHaveAttribute(
      "href",
      "/admin/products/new",
    );
  });

  it("is hidden from a user without product:write", async () => {
    await renderPage();
    expect(screen.queryByRole("link", { name: "New product" })).not.toBeInTheDocument();
  });
});

describe("empty states", () => {
  it("says honestly that none have been created yet, with no filters applied", async () => {
    await renderPage();
    expect(screen.getByText("No products have been created yet.")).toBeInTheDocument();
  });

  it("says none match once a filter is applied", async () => {
    await renderPage({ q: "nothing-like-this" });
    expect(screen.getByText("No products match these filters.")).toBeInTheDocument();
  });
});

describe("with data", () => {
  it("lists a row with its name, slug, category and status", async () => {
    mocks.db.product.count.mockResolvedValue(1);
    mocks.db.product.findMany.mockResolvedValue([
      {
        id: "0d4f2c1a-0000-4000-8000-00000000000a",
        slug: "steel-wire-mesh",
        categorySlug: "hardware-products",
        status: "DRAFT",
        featured: false,
        sortOrder: 0,
        updatedAt: new Date("2026-06-01T00:00:00Z"),
        translations: [{ locale: "en", name: "Steel Wire Mesh" }],
        images: [],
      },
    ]);

    await renderPage();

    const row = screen.getByRole("row", { name: /Steel Wire Mesh/ });
    const link = within(row).getByRole("link", { name: /Steel Wire Mesh/ });
    expect(link).toHaveAttribute("href", "/admin/products/0d4f2c1a-0000-4000-8000-00000000000a");
    expect(row).toHaveTextContent("steel-wire-mesh");
    expect(within(row).getByText("Draft")).toBeInTheDocument();
  });
});

describe("filters reach the query", () => {
  it("translates status and category into the list query", async () => {
    await renderPage({ status: "published", category: "hardware-products" });
    const where = mocks.db.product.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ status: "PUBLISHED", categorySlug: "hardware-products" });
  });
});

describe("database outage while listing", () => {
  it("lets an unrelated error reach the error boundary", async () => {
    mocks.db.product.count.mockRejectedValue(new TypeError("bug"));
    await expect(ProductsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("bug");
  });
});
