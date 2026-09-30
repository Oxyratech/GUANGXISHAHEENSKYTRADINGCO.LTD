import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Permission } from "@/server/auth/permissions";
import type { AuthSession } from "@/server/auth/session";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn(),
  countPublishedByCategory: vi.fn(),
}));

class RedirectSignal extends Error {}

vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/ui/test-utils")).navigationMock,
);
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/auth/session", () => ({ getSession: mocks.getSession }));
vi.mock("@/server/products", () => ({
  countPublishedByCategory: mocks.countPublishedByCategory,
}));

import CategoriesRegistryPage, { metadata } from "./page";

function makeSession(...permissions: Permission[]): AuthSession {
  return {
    sessionId: "s1",
    user: { id: "u1", email: "staff@example.com", name: "Staff" },
    roles: ["CONTENT_MANAGER"],
    permissions: new Set(permissions),
  };
}

beforeEach(() => {
  mocks.getSession.mockReset().mockResolvedValue(makeSession("category:read"));
  mocks.redirect.mockReset().mockImplementation((path: string) => {
    throw new RedirectSignal(path);
  });
  mocks.countPublishedByCategory.mockReset().mockResolvedValue({ ok: true, data: {} });
});

it("is titled Categories", () => {
  expect(metadata.title).toBe("Categories");
});

describe("access", () => {
  it("shows the 403 panel to a user without category:read", async () => {
    mocks.getSession.mockResolvedValue(makeSession("product:read"));
    render(await CategoriesRegistryPage());
    expect(
      screen.getByRole("heading", { name: "You do not have access to this page" }),
    ).toBeInTheDocument();
    expect(mocks.countPublishedByCategory).not.toHaveBeenCalled();
  });
});

describe("with database data", () => {
  it("lists exactly the 12 categories, names it as managed in code, and shows real counts", async () => {
    mocks.countPublishedByCategory.mockResolvedValue({
      ok: true,
      data: { "hardware-products": 3 },
    });

    render(await CategoriesRegistryPage());

    expect(screen.getByText("Managed in code")).toBeInTheDocument();
    expect(screen.getByText("src/content/categories.ts")).toBeInTheDocument();
    const rows = screen.getAllByRole("row");
    // header row + 12 category rows
    expect(rows).toHaveLength(13);
    const row = screen.getByRole("row", { name: /Hardware Products/ });
    expect(within(row).getByText("3")).toBeInTheDocument();
  });

  it("marks regulated categories", async () => {
    render(await CategoriesRegistryPage());
    expect(screen.getAllByText("Regulated").length).toBeGreaterThan(0);
  });
});

describe("without a database", () => {
  it("says honestly that published counts are unavailable, never a fabricated zero", async () => {
    mocks.countPublishedByCategory.mockResolvedValue({ ok: false, cause: "not_configured" });

    render(await CategoriesRegistryPage());

    expect(
      screen.getByText(/database is not available right now, so published-product counts/),
    ).toBeInTheDocument();
  });
});
