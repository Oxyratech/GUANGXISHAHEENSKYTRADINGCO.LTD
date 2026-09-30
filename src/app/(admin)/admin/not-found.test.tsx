import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseUnavailableError } from "@/server/db/errors";
import type { AuthSession } from "@/server/auth/session";

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/ui/test-utils")).navigationMock,
);
vi.mock("next/navigation", () => ({ usePathname: () => "/admin/nope" }));
vi.mock("@/server/auth/session", () => ({ getSession: mocks.getSession }));
vi.mock("@/components/admin/sign-out-action", () => ({ signOutAction: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import AdminNotFoundPage from "./not-found";

const session: AuthSession = {
  sessionId: "s1",
  user: { id: "u1", email: "a@example.com", name: "Amina" },
  roles: ["ADMIN"],
  permissions: new Set(["dashboard:read"]),
};

beforeEach(() => {
  mocks.getSession.mockReset();
});

describe("the admin 404 page", () => {
  it("keeps the shell for a signed-in user", async () => {
    mocks.getSession.mockResolvedValue(session);

    render(await AdminNotFoundPage());

    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Admin" })).toBeInTheDocument();
    expect(screen.getAllByRole("main")).toHaveLength(1);
  });

  it("stands alone for a visitor who is not signed in", async () => {
    mocks.getSession.mockResolvedValue(null);

    render(await AdminNotFoundPage());

    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.getAllByRole("main")).toHaveLength(1);
  });

  it("stands alone, without failing, when the database is down", async () => {
    mocks.getSession.mockRejectedValue(
      new DatabaseUnavailableError("down", { cause: "connection" }),
    );

    render(await AdminNotFoundPage());

    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
