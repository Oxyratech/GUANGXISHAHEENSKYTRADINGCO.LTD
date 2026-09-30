import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseUnavailableError } from "@/server/db/errors";
import type { AuthSession } from "@/server/auth/session";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  isDatabaseConfigured: vi.fn(),
  redirect: vi.fn(),
}));

class RedirectSignal extends Error {}

vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/ui/test-utils")).navigationMock,
);
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/auth/session", () => ({ getSession: mocks.getSession }));
vi.mock("@/server/db", () => ({ isDatabaseConfigured: mocks.isDatabaseConfigured }));
// The form imports the real action, which pulls in the whole server-side login stack.
vi.mock("./actions", () => ({ loginAction: vi.fn() }));

import LoginPage, { metadata } from "./page";

const session: AuthSession = {
  sessionId: "s1",
  user: { id: "u1", email: "a@example.com", name: "A" },
  roles: ["ADMIN"],
  permissions: new Set(),
};

async function renderPage(params: Record<string, string | string[] | undefined> = {}) {
  render(await LoginPage({ searchParams: Promise.resolve(params) }));
}

const submit = () => screen.getByRole("button", { name: "Sign in" });
const nextField = () => document.querySelector<HTMLInputElement>('input[name="next"]');

beforeEach(() => {
  mocks.getSession.mockReset().mockResolvedValue(null);
  mocks.isDatabaseConfigured.mockReset().mockReturnValue(true);
  mocks.redirect.mockReset().mockImplementation((path: string) => {
    throw new RedirectSignal(path);
  });
});

describe("the sign-in page", () => {
  it("is titled and has one h1", async () => {
    await renderPage();

    expect(metadata.title).toBe("Sign in");
    expect(screen.getByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("shows the labelled email and password fields with the right autocomplete hints", async () => {
    await renderPage();

    const email = screen.getByLabelText(/^Email/);
    const password = screen.getByLabelText(/^Password/);
    expect(email).toHaveAttribute("autocomplete", "username");
    expect(email).toHaveAttribute("type", "email");
    expect(password).toHaveAttribute("autocomplete", "current-password");
    expect(password).toHaveAttribute("type", "password");
    expect(email).toHaveFocus();
    expect(submit()).toBeEnabled();
  });

  it("does not warn when everything is fine", async () => {
    await renderPage();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("without a database", () => {
  it("explains what is missing and disables the submit button", async () => {
    mocks.isDatabaseConfigured.mockReturnValue(false);

    await renderPage();

    expect(
      screen.getByText(
        "The admin area needs a database connection (DATABASE_URL). See docs/DATABASE.md.",
      ),
    ).toBeInTheDocument();
    expect(submit()).toBeDisabled();
  });

  it("does not look for a session it cannot have", async () => {
    mocks.isDatabaseConfigured.mockReturnValue(false);

    await renderPage();

    expect(mocks.getSession).not.toHaveBeenCalled();
  });
});

describe("during a database outage", () => {
  it("says sign-in is not possible and disables the submit button", async () => {
    mocks.getSession.mockRejectedValue(
      new DatabaseUnavailableError("down", { cause: "connection" }),
    );

    await renderPage();

    expect(screen.getByText(/database is not available right now/i)).toBeInTheDocument();
    expect(submit()).toBeDisabled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("does not swallow errors that are not outages", async () => {
    mocks.getSession.mockRejectedValue(new TypeError("bug"));

    await expect(renderPage()).rejects.toThrow("bug");
  });
});

describe("a signed-in visitor", () => {
  it("is sent to the dashboard", async () => {
    mocks.getSession.mockResolvedValue(session);

    await expect(renderPage()).rejects.toThrow(RedirectSignal);
    expect(mocks.redirect).toHaveBeenCalledWith("/admin");
  });

  it("is sent to the page they asked for when it is a safe admin path", async () => {
    mocks.getSession.mockResolvedValue(session);

    await expect(renderPage({ next: "/admin/users" })).rejects.toThrow(RedirectSignal);
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/users");
  });

  it("is never sent off-site", async () => {
    mocks.getSession.mockResolvedValue(session);

    await expect(renderPage({ next: "https://evil.example" })).rejects.toThrow(RedirectSignal);
    expect(mocks.redirect).toHaveBeenCalledWith("/admin");
  });
});

describe("the return path", () => {
  it("is carried in a hidden field when it is a safe admin path", async () => {
    await renderPage({ next: "/admin/inquiries?status=NEW" });

    expect(nextField()?.value).toBe("/admin/inquiries?status=NEW");
  });

  it.each(["https://evil.example", "//evil.example", "/en/products", "javascript:alert(1)"])(
    "replaces %j with the dashboard",
    async (next) => {
      await renderPage({ next });

      expect(nextField()?.value).toBe("/admin");
    },
  );

  it("uses the first value of a repeated parameter", async () => {
    await renderPage({ next: ["/admin/roles", "https://evil.example"] });

    expect(nextField()?.value).toBe("/admin/roles");
  });
});
