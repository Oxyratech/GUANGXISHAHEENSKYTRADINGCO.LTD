/**
 * RBAC definition — the single source for the seed, server-side authorisation and the admin UI.
 * Permissions are `resource:action`. A user's effective permissions are the union of their roles'.
 *
 * Authorisation is always enforced on the server (see auth/authorize). Hiding UI is cosmetic.
 */
export const PERMISSIONS = {
  "dashboard:read": "View the admin dashboard",

  "inquiry:read": "View business inquiries and their attachments",
  "inquiry:update": "Change inquiry status and assignment",
  "inquiry:note": "Add internal notes to inquiries",
  "contact:read": "View contact messages",
  "contact:update": "Update contact message status",

  "product:read": "View products",
  "product:write": "Create and edit products",
  "product:publish": "Publish and unpublish products",
  "product:delete": "Delete products",

  "category:read": "View product categories (managed in code)",
  "service:read": "View services (managed in code)",
  "faq:read": "View FAQs (managed in code)",

  "news:read": "View news articles",
  "news:write": "Create and edit news articles",
  "news:publish": "Publish and unpublish news articles",
  "news:delete": "Delete news articles",

  "media:read": "View the media library",
  "media:upload": "Upload media",
  "media:delete": "Delete media",

  "translation:read": "View translation coverage",
  "seo:read": "View SEO overrides",
  "seo:write": "Edit SEO overrides",

  "user:read": "View admin users",
  "user:write": "Create, edit and deactivate admin users",
  "user:assign-role": "Assign roles to users",
  "role:read": "View roles and permissions",
  "role:write": "Edit role permissions",

  "settings:read": "View site settings",
  "settings:write": "Edit site settings",
  "audit:read": "View the audit log",
} as const;

export type Permission = keyof typeof PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export const ROLE_KEYS = ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER", "SALES_MANAGER"] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export interface RoleDefinition {
  readonly key: RoleKey;
  readonly name: string;
  readonly description: string;
  readonly permissions: readonly Permission[];
}

const CONTENT_PERMISSIONS: readonly Permission[] = [
  "dashboard:read",
  "product:read",
  "product:write",
  "product:publish",
  "product:delete",
  "category:read",
  "service:read",
  "faq:read",
  "news:read",
  "news:write",
  "news:publish",
  "news:delete",
  "media:read",
  "media:upload",
  "media:delete",
  "translation:read",
  "seo:read",
  "seo:write",
];

const SALES_PERMISSIONS: readonly Permission[] = [
  "dashboard:read",
  "inquiry:read",
  "inquiry:update",
  "inquiry:note",
  "contact:read",
  "contact:update",
  "product:read",
  "media:read",
];

export const ROLE_DEFINITIONS: readonly RoleDefinition[] = [
  {
    key: "SUPER_ADMIN",
    name: "Super Admin",
    description: "Full access, including roles and permissions.",
    permissions: ALL_PERMISSIONS,
  },
  {
    key: "ADMIN",
    name: "Admin",
    description: "Manages content, inquiries, users and settings. Cannot edit role permissions.",
    permissions: ALL_PERMISSIONS.filter((p) => p !== "role:write"),
  },
  {
    key: "CONTENT_MANAGER",
    name: "Content Manager",
    description: "Manages products, news, media and SEO. No access to inquiries or users.",
    permissions: CONTENT_PERMISSIONS,
  },
  {
    key: "SALES_MANAGER",
    name: "Sales / Inquiry Manager",
    description: "Works inquiries and contact messages; read-only product access.",
    permissions: SALES_PERMISSIONS,
  },
];

export function isPermission(value: string): value is Permission {
  return Object.prototype.hasOwnProperty.call(PERMISSIONS, value);
}

export function isRoleKey(value: string): value is RoleKey {
  return (ROLE_KEYS as readonly string[]).includes(value);
}
