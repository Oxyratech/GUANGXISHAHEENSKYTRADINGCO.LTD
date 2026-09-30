import type { Permission } from "@/server/auth/permissions";

/*
 * The admin navigation model: routes, labels and the permission that shows each entry. It is data, so
 * the sidebar, the mobile drawer and the tests all read the same list.
 *
 * Filtering here is about not showing links a user cannot use. It is not access control: every page
 * checks its own permission on the server (requireAdminPage).
 */

export type NavIconName =
  | "dashboard"
  | "inquiries"
  | "contact"
  | "products"
  | "categories"
  | "services"
  | "faqs"
  | "media"
  | "news"
  | "seo"
  | "translations"
  | "users"
  | "roles"
  | "settings"
  | "audit";

export interface AdminNavItem {
  label: string;
  href: string;
  permission: Permission;
  icon: NavIconName;
}

export interface AdminNavGroup {
  label: string;
  items: readonly AdminNavItem[];
}

export const ADMIN_NAV: readonly AdminNavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", permission: "dashboard:read", icon: "dashboard" },
    ],
  },
  {
    label: "Sales",
    items: [
      {
        label: "Inquiries",
        href: "/admin/inquiries",
        permission: "inquiry:read",
        icon: "inquiries",
      },
      {
        label: "Contact messages",
        href: "/admin/contact-messages",
        permission: "contact:read",
        icon: "contact",
      },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { label: "Products", href: "/admin/products", permission: "product:read", icon: "products" },
      {
        label: "Categories",
        href: "/admin/categories",
        permission: "category:read",
        icon: "categories",
      },
      { label: "Services", href: "/admin/services", permission: "service:read", icon: "services" },
      { label: "FAQs", href: "/admin/faqs", permission: "faq:read", icon: "faqs" },
      { label: "Media", href: "/admin/media", permission: "media:read", icon: "media" },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "News", href: "/admin/news", permission: "news:read", icon: "news" },
      { label: "SEO", href: "/admin/seo", permission: "seo:read", icon: "seo" },
      {
        label: "Translations",
        href: "/admin/translations",
        permission: "translation:read",
        icon: "translations",
      },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Users", href: "/admin/users", permission: "user:read", icon: "users" },
      { label: "Roles", href: "/admin/roles", permission: "role:read", icon: "roles" },
      { label: "Settings", href: "/admin/settings", permission: "settings:read", icon: "settings" },
      { label: "Audit log", href: "/admin/audit-logs", permission: "audit:read", icon: "audit" },
    ],
  },
];

/** The groups (and entries) a user with these permissions gets to see. Empty groups disappear. */
export function getVisibleNav(permissions: ReadonlySet<Permission>): AdminNavGroup[] {
  return ADMIN_NAV.map((group) => ({
    label: group.label,
    items: group.items.filter((item) => permissions.has(item.permission)),
  })).filter((group) => group.items.length > 0);
}

export type NavActiveState = "page" | "section" | null;

function withoutTrailingSlash(path: string): string {
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

/**
 * "page" when the entry is exactly the current page, "section" when the current page is inside it
 * (an inquiry's detail page inside Inquiries). The dashboard owns `/admin` alone: every admin page
 * lives under that prefix, so it must never count as a section.
 */
export function getNavActiveState(pathname: string, href: string): NavActiveState {
  const current = withoutTrailingSlash(pathname);
  if (current === href) return "page";
  if (href !== "/admin" && current.startsWith(`${href}/`)) return "section";
  return null;
}
