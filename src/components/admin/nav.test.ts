import { describe, expect, it } from "vitest";
import { isPermission, type Permission } from "@/server/auth/permissions";
import { ADMIN_NAV, getNavActiveState, getVisibleNav } from "./nav";

const allItems = ADMIN_NAV.flatMap((group) => group.items);
const perms = (...list: Permission[]) => new Set<Permission>(list);
const labels = (groups: ReturnType<typeof getVisibleNav>) =>
  groups.flatMap((group) => group.items.map((item) => item.label));

describe("the navigation model", () => {
  it("has the five groups in order", () => {
    expect(ADMIN_NAV.map((group) => group.label)).toEqual([
      "Overview",
      "Sales",
      "Catalogue",
      "Content",
      "Administration",
    ]);
  });

  it("links every area the admin will have, gated by its read permission", () => {
    expect(allItems.map((item) => [item.label, item.href, item.permission])).toEqual([
      ["Dashboard", "/admin", "dashboard:read"],
      ["Inquiries", "/admin/inquiries", "inquiry:read"],
      ["Contact messages", "/admin/contact-messages", "contact:read"],
      ["Products", "/admin/products", "product:read"],
      ["Categories", "/admin/categories", "category:read"],
      ["Services", "/admin/services", "service:read"],
      ["FAQs", "/admin/faqs", "faq:read"],
      ["Media", "/admin/media", "media:read"],
      ["News", "/admin/news", "news:read"],
      ["SEO", "/admin/seo", "seo:read"],
      ["Translations", "/admin/translations", "translation:read"],
      ["Users", "/admin/users", "user:read"],
      ["Roles", "/admin/roles", "role:read"],
      ["Settings", "/admin/settings", "settings:read"],
      ["Audit log", "/admin/audit-logs", "audit:read"],
    ]);
  });

  it("only uses permissions that exist and hrefs that are unique admin paths", () => {
    for (const item of allItems) {
      expect(isPermission(item.permission)).toBe(true);
      expect(item.href).toMatch(/^\/admin(\/[a-z-]+)?$/);
    }
    expect(new Set(allItems.map((item) => item.href)).size).toBe(allItems.length);
  });
});

describe("getVisibleNav", () => {
  it("shows nothing to a user with no permissions", () => {
    expect(getVisibleNav(perms())).toEqual([]);
  });

  it("shows only the entries whose permission the user holds", () => {
    const groups = getVisibleNav(perms("dashboard:read", "inquiry:read", "audit:read"));

    expect(labels(groups)).toEqual(["Dashboard", "Inquiries", "Audit log"]);
  });

  it("drops a group when none of its entries is allowed", () => {
    const groups = getVisibleNav(perms("dashboard:read", "user:read"));

    expect(groups.map((group) => group.label)).toEqual(["Overview", "Administration"]);
  });

  it("does not treat a write permission as a read permission", () => {
    expect(labels(getVisibleNav(perms("product:write", "news:write", "user:write")))).toEqual([]);
  });

  it("gives a sales manager the sales and read-only catalogue entries", () => {
    const salesManager = perms(
      "dashboard:read",
      "inquiry:read",
      "inquiry:update",
      "inquiry:note",
      "contact:read",
      "contact:update",
      "product:read",
      "media:read",
    );

    expect(labels(getVisibleNav(salesManager))).toEqual([
      "Dashboard",
      "Inquiries",
      "Contact messages",
      "Products",
      "Media",
    ]);
  });

  it("gives every entry to a user who holds every permission", () => {
    const everything = perms(...allItems.map((item) => item.permission));

    expect(labels(getVisibleNav(everything))).toHaveLength(allItems.length);
  });
});

describe("getNavActiveState", () => {
  it("is 'page' for the exact path, with or without a trailing slash", () => {
    expect(getNavActiveState("/admin/inquiries", "/admin/inquiries")).toBe("page");
    expect(getNavActiveState("/admin/inquiries/", "/admin/inquiries")).toBe("page");
  });

  it("is 'section' for a page inside the entry", () => {
    expect(getNavActiveState("/admin/inquiries/abc", "/admin/inquiries")).toBe("section");
  });

  it("is null for other pages, including look-alike prefixes", () => {
    expect(getNavActiveState("/admin/products", "/admin/inquiries")).toBeNull();
    expect(getNavActiveState("/admin/newsletter", "/admin/news")).toBeNull();
  });

  it("gives the dashboard only /admin itself, never the whole admin", () => {
    expect(getNavActiveState("/admin", "/admin")).toBe("page");
    expect(getNavActiveState("/admin/", "/admin")).toBe("page");
    expect(getNavActiveState("/admin/inquiries", "/admin")).toBeNull();
  });
});
