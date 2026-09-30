import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Permission, RoleKey } from "@/server/auth/permissions";
import type { AuthSession } from "@/server/auth/session";

const mocks = vi.hoisted(() => ({ pathname: "/admin", signOut: vi.fn() }));

vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/ui/test-utils")).navigationMock,
);
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));
vi.mock("./sign-out-action", () => ({ signOutAction: mocks.signOut }));

import { AdminShell } from "./AdminShell";

function makeSession(
  permissions: Permission[],
  roles: RoleKey[] = ["SALES_MANAGER"],
  name = "Amina Yusuf",
): AuthSession {
  return {
    sessionId: "s1",
    user: { id: "u1", email: "amina@example.com", name },
    roles,
    permissions: new Set(permissions),
  };
}

const SALES: Permission[] = ["dashboard:read", "inquiry:read", "contact:read", "product:read"];

function renderShell(session = makeSession(SALES)) {
  return render(
    <AdminShell session={session}>
      <h1>Page content</h1>
    </AdminShell>,
  );
}

beforeEach(() => {
  mocks.pathname = "/admin";
  mocks.signOut.mockReset();
});

describe("AdminShell landmarks", () => {
  it("has a skip link that is the first focusable element and targets the main region", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.tab();

    const skip = screen.getByRole("link", { name: "Skip to content" });
    expect(skip).toHaveFocus();
    expect(skip).toHaveAttribute("href", "#main");
    expect(document.getElementById("main")).toBe(screen.getByRole("main"));
  });

  it("has a banner, a navigation, and a focusable main that holds the page", () => {
    renderShell();

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Admin" })).toBeInTheDocument();
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("tabindex", "-1");
    expect(within(main).getByRole("heading", { name: "Page content" })).toBeInTheDocument();
  });

  it("shows the brand as plain text, not a link into the public site", () => {
    renderShell();

    expect(screen.getAllByText("SHAHEEN").length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /shaheen/i })).not.toBeInTheDocument();
  });
});

describe("AdminShell top bar", () => {
  it("shows who is signed in, with a link to their account, and their roles", () => {
    renderShell(makeSession(SALES, ["SALES_MANAGER", "CONTENT_MANAGER"]));

    const banner = screen.getByRole("banner");
    expect(within(banner).getByRole("link", { name: "Amina Yusuf" })).toHaveAttribute(
      "href",
      "/admin/account",
    );
    expect(banner).toHaveTextContent("Sales / Inquiry Manager, Content Manager");
  });

  it("puts a long name in a truncating element instead of breaking the layout", () => {
    renderShell(makeSession(SALES, ["ADMIN"], "A".repeat(200)));

    expect(within(screen.getByRole("banner")).getByRole("link").className).toContain("truncate");
  });

  it("offers Sign out as a form button that runs the sign-out action", async () => {
    const user = userEvent.setup();
    renderShell();

    const button = screen.getByRole("button", { name: "Sign out" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button.closest("form")).not.toBeNull();
    await user.click(button);

    expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });

  it("never renders a sign-out link (a GET must not end a session)", () => {
    renderShell();

    expect(screen.queryByRole("link", { name: /sign out|log ?out/i })).not.toBeInTheDocument();
  });
});

describe("AdminShell navigation", () => {
  it("shows only the entries the session may use", () => {
    renderShell();

    const nav = screen.getByRole("navigation", { name: "Admin" });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Dashboard", "Inquiries", "Contact messages", "Products"]);
  });

  it("shows everything to a user who holds every permission", () => {
    const all = makeSession(
      [
        "dashboard:read",
        "inquiry:read",
        "contact:read",
        "product:read",
        "category:read",
        "service:read",
        "faq:read",
        "media:read",
        "news:read",
        "seo:read",
        "translation:read",
        "user:read",
        "role:read",
        "settings:read",
        "audit:read",
      ],
      ["SUPER_ADMIN"],
    );
    renderShell(all);

    const nav = screen.getByRole("navigation", { name: "Admin" });
    expect(within(nav).getAllByRole("link")).toHaveLength(15);
  });

  it("marks the current page", () => {
    mocks.pathname = "/admin/contact-messages";
    renderShell();

    expect(screen.getByRole("link", { name: "Contact messages" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

describe("AdminShell on a small screen", () => {
  it("opens the same navigation in a named drawer and closes it with Escape", async () => {
    const user = userEvent.setup();
    renderShell();

    const trigger = screen.getByRole("button", { name: "Open menu" });
    await user.click(trigger);

    const drawer = screen.getByRole("dialog", { name: "Menu" });
    expect(within(drawer).getByRole("navigation", { name: "Admin" })).toBeInTheDocument();
    expect(
      within(drawer)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Dashboard", "Inquiries", "Contact messages", "Products"]);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes the drawer when the route changes", async () => {
    const user = userEvent.setup();
    const view = renderShell();
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    mocks.pathname = "/admin/inquiries";
    view.rerender(
      <AdminShell session={makeSession(SALES)}>
        <h1>Page content</h1>
      </AdminShell>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
