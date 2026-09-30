import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Permission } from "@/server/auth/permissions";
import { getVisibleNav } from "./nav";

const mocks = vi.hoisted(() => ({ pathname: "/admin" }));

vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));

import { SidebarNav } from "./SidebarNav";

const perms = (...list: Permission[]) => new Set<Permission>(list);

function renderNav(pathname: string, permissions: Set<Permission>, tone?: "dark" | "light") {
  mocks.pathname = pathname;
  return render(<SidebarNav groups={getVisibleNav(permissions)} tone={tone} />);
}

beforeEach(() => {
  mocks.pathname = "/admin";
});

describe("SidebarNav", () => {
  it("is a labelled navigation landmark with a named list per group", () => {
    renderNav("/admin", perms("dashboard:read", "inquiry:read", "product:read"));

    const nav = screen.getByRole("navigation", { name: "Admin" });
    expect(within(nav).getByRole("list", { name: "Overview" })).toBeInTheDocument();
    expect(within(nav).getByRole("list", { name: "Sales" })).toBeInTheDocument();
    expect(within(nav).getByRole("list", { name: "Catalogue" })).toBeInTheDocument();
    expect(within(nav).queryByRole("list", { name: "Administration" })).not.toBeInTheDocument();
  });

  it("lists only the entries the session's permissions allow", () => {
    renderNav("/admin", perms("dashboard:read", "inquiry:read"));

    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Dashboard",
      "Inquiries",
    ]);
    expect(screen.queryByRole("link", { name: "Users" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Settings" })).not.toBeInTheDocument();
  });

  it("links to the admin routes", () => {
    renderNav("/admin", perms("dashboard:read", "audit:read", "contact:read"));

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("link", { name: "Audit log" })).toHaveAttribute(
      "href",
      "/admin/audit-logs",
    );
    expect(screen.getByRole("link", { name: "Contact messages" })).toHaveAttribute(
      "href",
      "/admin/contact-messages",
    );
  });

  it("marks the current page with aria-current='page' and nothing else", () => {
    renderNav("/admin/inquiries", perms("dashboard:read", "inquiry:read", "contact:read"));

    expect(screen.getByRole("link", { name: "Inquiries" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Contact messages" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("marks the dashboard current on /admin", () => {
    renderNav("/admin", perms("dashboard:read", "inquiry:read"));

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Inquiries" })).not.toHaveAttribute("aria-current");
  });

  it("marks the section that contains a detail page, without claiming the dashboard", () => {
    renderNav("/admin/inquiries/abc", perms("dashboard:read", "inquiry:read"));

    expect(screen.getByRole("link", { name: "Inquiries" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("does not hide the current entry's meaning in colour alone: its text is unchanged", () => {
    renderNav("/admin/inquiries", perms("inquiry:read"));

    expect(screen.getByRole("link", { name: "Inquiries" })).toHaveTextContent("Inquiries");
  });

  it("keeps its icons out of the accessibility tree", () => {
    const { container } = renderNav("/admin", perms("dashboard:read"));

    for (const icon of container.querySelectorAll("svg")) {
      expect(icon).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("renders the light tone used inside the drawer", () => {
    renderNav("/admin", perms("dashboard:read"), "light");

    expect(screen.getByRole("link", { name: "Dashboard" }).className).toContain("text-navy-900");
  });
});
