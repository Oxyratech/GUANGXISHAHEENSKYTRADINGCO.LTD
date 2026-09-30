import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseUnavailableError } from "@/server/db/errors";
import type { Permission } from "@/server/auth/permissions";
import type { AuthSession } from "@/server/auth/session";

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), redirect: vi.fn() }));

class RedirectSignal extends Error {}

vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/ui/test-utils")).navigationMock,
);
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  usePathname: () => "/admin",
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/server/auth/session", () => ({ getSession: mocks.getSession }));
vi.mock("@/components/admin/sign-out-action", () => ({ signOutAction: vi.fn() }));

import ConsoleLayout from "./layout";

function makeSession(...permissions: Permission[]): AuthSession {
  return {
    sessionId: "s1",
    user: { id: "u1", email: "a@example.com", name: "Amina" },
    roles: ["SALES_MANAGER"],
    permissions: new Set(permissions),
  };
}

const page = <h1>The page</h1>;

beforeEach(() => {
  mocks.getSession.mockReset();
  mocks.redirect.mockReset().mockImplementation((path: string) => {
    throw new RedirectSignal(path);
  });
});

describe("ConsoleLayout", () => {
  it("draws the shell around the page for a signed-in user", async () => {
    mocks.getSession.mockResolvedValue(makeSession("dashboard:read", "inquiry:read"));

    render(await ConsoleLayout({ children: page }));

    expect(screen.getByRole("navigation", { name: "Admin" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toContainElement(
      screen.getByRole("heading", { name: "The page" }),
    );
    expect(screen.getByRole("link", { name: "Inquiries" })).toBeInTheDocument();
  });

  it("redirects a visitor without a session to the login page and renders nothing", async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(ConsoleLayout({ children: page })).rejects.toThrow(RedirectSignal);
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/login");
  });

  it("shows the outage on its own, without the shell or the page, and does not redirect", async () => {
    mocks.getSession.mockRejectedValue(
      new DatabaseUnavailableError("down", { cause: "connection" }),
    );

    render(await ConsoleLayout({ children: page }));

    expect(
      screen.getByRole("heading", { name: "The database could not be reached" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "The page" })).not.toBeInTheDocument();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("says the database is not configured when a cookie exists but DATABASE_URL does not", async () => {
    mocks.getSession.mockRejectedValue(
      new DatabaseUnavailableError("DATABASE_URL is not configured", { cause: "not_configured" }),
    );

    render(await ConsoleLayout({ children: page }));

    expect(screen.getByRole("heading", { name: "Database not configured" })).toBeInTheDocument();
  });

  it("does not swallow other errors", async () => {
    mocks.getSession.mockRejectedValue(new TypeError("bug"));

    await expect(ConsoleLayout({ children: page })).rejects.toThrow("bug");
  });
});
