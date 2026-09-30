// TEMPORARY local visual check: renders the shell and dashboard to static HTML. Deleted after use.
import { writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { it, vi } from "vitest";
import type { AuthSession } from "@/server/auth/session";

vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/ui/test-utils")).navigationMock,
);
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("./sign-out-action", () => ({ signOutAction: vi.fn() }));
const login = vi.hoisted(() => ({ configured: true }));
vi.mock("@/server/auth/session", () => ({ getSession: async () => null }));
vi.mock("@/server/db", () => ({ isDatabaseConfigured: () => login.configured }));
vi.mock("@/app/(admin)/admin/login/actions", () => ({ loginAction: vi.fn() }));
vi.mock("../../app/(admin)/admin/login/actions", () => ({ loginAction: vi.fn() }));

import { AdminShell } from "./AdminShell";
import { DashboardView } from "./dashboard/DashboardView";
import { DatabaseUnavailablePanel } from "./DatabaseUnavailablePanel";
import { AccessDenied } from "./AccessDenied";
import { PageHeader } from "./PageHeader";

const OUT =
  "C:/Users/DC/AppData/Local/Temp/claude/C--Users-DC-Documents-GitHub-GUANGXISHAHEENSKYTRADINGCO-LTD/e4b80904-0004-429c-a97d-c0f44cabf5f9/scratchpad";

const session: AuthSession = {
  sessionId: "s",
  user: { id: "u", email: "amina@example.com", name: "Amina Yusuf" },
  roles: ["SUPER_ADMIN"],
  permissions: new Set([
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
  ]),
};

const doc = (body: string) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="out.css"></head><body class="min-h-dvh bg-surface text-ink">${body}</body></html>`;

it("writes visual fixtures", async () => {
  const { default: LoginPage } = await import("../../app/(admin)/admin/login/page");
  login.configured = true;
  writeFileSync(
    `${OUT}/login.html`,
    doc(renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({}) }))),
  );
  login.configured = false;
  writeFileSync(
    `${OUT}/login-nodb.html`,
    doc(renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({}) }))),
  );
  login.configured = true;
  const full = {
    inquiries: {
      total: 42,
      newCount: 5,
      receivedLast7Days: 9,
      byStatus: [
        { status: "NEW", count: 5 },
        { status: "REVIEWING", count: 8 },
        { status: "QUALIFIED", count: 6 },
        { status: "QUOTATION", count: 7 },
        { status: "NEGOTIATION", count: 4 },
        { status: "CONFIRMED", count: 3 },
        { status: "COMPLETED", count: 7 },
        { status: "CANCELLED", count: 2 },
      ],
      recent: Array.from({ length: 4 }, (_, i) => ({
        id: `id-${i}`,
        referenceCode: `INQ-7K3Q9M2${i}`,
        company: ["Acme Trading", "Al Noor Foods", "Kestrel Imports", "Sunrise Textiles"][i],
        country: ["CN", "SA", "Kenya", "AE"][i],
        status: ["NEW", "REVIEWING", "QUOTATION", "NEW"][i],
        createdAt: new Date(Date.UTC(2026, 8, 29 - i, 8, 30)),
      })),
    },
    contact: { total: 12, newCount: 2 },
    products: {
      total: 9,
      byStatus: [
        { status: "DRAFT", count: 3 },
        { status: "PUBLISHED", count: 5 },
        { status: "ARCHIVED", count: 1 },
      ],
    },
    news: { total: 4, published: 3 },
    audit: {
      recent: [
        {
          id: "1",
          actorEmail: "amina@example.com",
          action: "inquiry.status_changed",
          entityType: "inquiry",
          entityId: "0d4f2c1a-0000",
          summary: "NEW to REVIEWING",
          createdAt: new Date("2026-09-30T09:00:00Z"),
        },
        {
          id: "2",
          actorEmail: null,
          action: "auth.login_failed",
          entityType: "user",
          entityId: null,
          summary: "Failed sign-in",
          createdAt: new Date("2026-09-30T08:00:00Z"),
        },
      ],
    },
  };
  const empty = {
    inquiries: {
      total: 0,
      newCount: 0,
      receivedLast7Days: 0,
      byStatus: full.inquiries.byStatus.map((s) => ({ ...s, count: 0 })),
      recent: [],
    },
    contact: { total: 0, newCount: 0 },
    products: { total: 0, byStatus: full.products.byStatus.map((s) => ({ ...s, count: 0 })) },
    news: { total: 0, published: 0 },
    audit: { recent: [] },
  };
  writeFileSync(
    `${OUT}/dash-full.html`,
    doc(
      renderToStaticMarkup(
        <AdminShell session={session}>
          <DashboardView data={full} session={session} />
        </AdminShell>,
      ),
    ),
  );
  writeFileSync(
    `${OUT}/dash-empty.html`,
    doc(
      renderToStaticMarkup(
        <AdminShell session={session}>
          <DashboardView data={empty} session={session} />
        </AdminShell>,
      ),
    ),
  );
  writeFileSync(
    `${OUT}/outage.html`,
    doc(
      renderToStaticMarkup(
        <AdminShell session={session}>
          <PageHeader title="Dashboard" />
          <DatabaseUnavailablePanel cause="connection" titleAs="h2" />
        </AdminShell>,
      ),
    ),
  );
  writeFileSync(
    `${OUT}/denied.html`,
    doc(
      renderToStaticMarkup(
        <AdminShell session={session}>
          <AccessDenied permission="inquiry:read" />
        </AdminShell>,
      ),
    ),
  );
});
