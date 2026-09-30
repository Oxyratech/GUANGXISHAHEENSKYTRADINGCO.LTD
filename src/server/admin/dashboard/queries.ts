import "server-only";
import {
  CONTACT_MESSAGE_STATUSES,
  INQUIRY_STATUSES,
  PUBLISH_STATUSES,
} from "@/lib/domain/statuses";
import type { Permission } from "@/server/auth/permissions";
import { getDb } from "@/server/db";
import { countFor, mergeStatusCounts, totalOf, type StatusCount } from "./status-counts";

/*
 * Everything the dashboard shows comes from these queries: real counts and real rows, nothing
 * estimated or sampled. Each section is fetched only when the user holds the matching permission (so
 * a role without access does not even cause the query), and the sections run in parallel. A database
 * outage surfaces as DatabaseUnavailableError for the page to render honestly.
 *
 * Selects list columns explicitly: no IP hashes, user agents, message bodies or internal notes.
 */

export interface RecentInquiry {
  id: string;
  referenceCode: string;
  company: string;
  country: string;
  status: string;
  createdAt: Date;
}

export interface RecentAuditEntry {
  /** AuditLog ids are BIGINT; a string is what a page can serialise and use as a key. */
  id: string;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string | null;
  createdAt: Date;
}

export interface DashboardData {
  inquiries: {
    total: number;
    newCount: number;
    receivedLast7Days: number;
    byStatus: StatusCount[];
    recent: RecentInquiry[];
  } | null;
  contact: { total: number; newCount: number } | null;
  products: { total: number; byStatus: StatusCount[] } | null;
  news: { total: number; published: number } | null;
  audit: { recent: RecentAuditEntry[] } | null;
}

export const RECENT_INQUIRY_LIMIT = 8;
export const RECENT_AUDIT_LIMIT = 10;
const RECENT_WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

type Permissions = ReadonlySet<Permission>;

async function loadInquiries(now: Date): Promise<NonNullable<DashboardData["inquiries"]>> {
  const db = getDb();
  const since = new Date(now.getTime() - RECENT_WINDOW_DAYS * DAY_MS);

  const [rows, receivedLast7Days, recent] = await Promise.all([
    db.businessInquiry.groupBy({ by: ["status"], _count: { _all: true } }),
    db.businessInquiry.count({ where: { createdAt: { gte: since } } }),
    db.businessInquiry.findMany({
      orderBy: { createdAt: "desc" },
      take: RECENT_INQUIRY_LIMIT,
      select: {
        id: true,
        referenceCode: true,
        company: true,
        country: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  const byStatus = mergeStatusCounts(
    rows.map((row) => ({ status: row.status, count: row._count._all })),
    INQUIRY_STATUSES,
  );
  return {
    total: totalOf(byStatus),
    newCount: countFor(byStatus, "NEW"),
    receivedLast7Days,
    byStatus,
    recent,
  };
}

async function loadContact(): Promise<NonNullable<DashboardData["contact"]>> {
  const rows = await getDb().contactMessage.groupBy({ by: ["status"], _count: { _all: true } });
  const byStatus = mergeStatusCounts(
    rows.map((row) => ({ status: row.status, count: row._count._all })),
    CONTACT_MESSAGE_STATUSES,
  );
  return { total: totalOf(byStatus), newCount: countFor(byStatus, "NEW") };
}

async function loadProducts(): Promise<NonNullable<DashboardData["products"]>> {
  const rows = await getDb().product.groupBy({ by: ["status"], _count: { _all: true } });
  const byStatus = mergeStatusCounts(
    rows.map((row) => ({ status: row.status, count: row._count._all })),
    PUBLISH_STATUSES,
  );
  return { total: totalOf(byStatus), byStatus };
}

async function loadNews(): Promise<NonNullable<DashboardData["news"]>> {
  const rows = await getDb().newsArticle.groupBy({ by: ["status"], _count: { _all: true } });
  const byStatus = mergeStatusCounts(
    rows.map((row) => ({ status: row.status, count: row._count._all })),
    PUBLISH_STATUSES,
  );
  return { total: totalOf(byStatus), published: countFor(byStatus, "PUBLISHED") };
}

async function loadAudit(): Promise<NonNullable<DashboardData["audit"]>> {
  const rows = await getDb().auditLog.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: RECENT_AUDIT_LIMIT,
    select: {
      id: true,
      actorEmail: true,
      action: true,
      entityType: true,
      entityId: true,
      summary: true,
      createdAt: true,
    },
  });
  return { recent: rows.map((row) => ({ ...row, id: row.id.toString() })) };
}

const skip = <T>(allowed: boolean, load: () => Promise<T>): Promise<T | null> =>
  allowed ? load() : Promise.resolve(null);

/** Loads every dashboard section the permissions allow; the others come back as `null`. */
export async function loadDashboard(
  permissions: Permissions,
  now: Date = new Date(),
): Promise<DashboardData> {
  const [inquiries, contact, products, news, audit] = await Promise.all([
    skip(permissions.has("inquiry:read"), () => loadInquiries(now)),
    skip(permissions.has("contact:read"), loadContact),
    skip(permissions.has("product:read"), loadProducts),
    skip(permissions.has("news:read"), loadNews),
    skip(permissions.has("audit:read"), loadAudit),
  ]);
  return { inquiries, contact, products, news, audit };
}
