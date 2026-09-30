import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SERVICES } from "@/content/services";
import type { Permission } from "@/server/auth/permissions";
import type { AuthSession } from "@/server/auth/session";

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), redirect: vi.fn() }));

class RedirectSignal extends Error {}

vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/ui/test-utils")).navigationMock,
);
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/auth/session", () => ({ getSession: mocks.getSession }));

import ServicesRegistryPage, { metadata } from "./page";

function makeSession(...permissions: Permission[]): AuthSession {
  return {
    sessionId: "s1",
    user: { id: "u1", email: "staff@example.com", name: "Staff" },
    roles: ["CONTENT_MANAGER"],
    permissions: new Set(permissions),
  };
}

beforeEach(() => {
  mocks.getSession.mockReset().mockResolvedValue(makeSession("service:read"));
  mocks.redirect.mockReset().mockImplementation((path: string) => {
    throw new RedirectSignal(path);
  });
});

it("is titled Services", () => {
  expect(metadata.title).toBe("Services");
});

describe("access", () => {
  it("shows the 403 panel to a user without service:read", async () => {
    mocks.getSession.mockResolvedValue(makeSession("product:read"));
    render(await ServicesRegistryPage());
    expect(
      screen.getByRole("heading", { name: "You do not have access to this page" }),
    ).toBeInTheDocument();
  });
});

describe("listing", () => {
  it("lists exactly the 6 code-defined services and names them managed in code", async () => {
    render(await ServicesRegistryPage());

    expect(screen.getByText("Managed in code")).toBeInTheDocument();
    expect(screen.getByText("src/content/services.ts")).toBeInTheDocument();
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(SERVICES.length + 1);
    expect(screen.getByRole("rowheader", { name: /Import & Export/ })).toBeInTheDocument();
  });
});
