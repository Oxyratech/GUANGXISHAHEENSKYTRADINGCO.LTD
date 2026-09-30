import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { INQUIRY_STATUSES } from "@/lib/domain/statuses";
import { getDb } from "@/server/db";
import { toDatabaseError } from "@/server/db/errors";
import { buildPageMeta, type PageMeta, type PageParams } from "@/server/admin/pagination";
import {
  mergeStatusCounts,
  totalOf,
  type StatusCount,
} from "@/server/admin/dashboard/status-counts";
import { endOfDayUtc, startOfDayUtc, type InquiryListFilters } from "./filters";

/*
 * The inquiries list query: one `where` built from the URL filters (never string-built SQL — Prisma
 * parameterises every value), one status-count query for the tabs, and one page of rows. Selects list
 * only the columns the table shows; internal notes, IP hashes and the full specification text never
 * leave the database for this query.
 */

export interface InquiryListRow {
  id: string;
  referenceCode: string;
  createdAt: Date;
  name: string;
  company: string;
  country: string;
  productName: string;
  categorySlug: string | null;
  status: string;
  assignedTo: { id: string; name: string } | null;
  attachmentCount: number;
}

export interface InquiryListResult {
  rows: InquiryListRow[];
  meta: PageMeta;
  statusCounts: StatusCount[];
  total: number;
}

function buildWhere(filters: InquiryListFilters): Prisma.BusinessInquiryWhereInput {
  const where: Prisma.BusinessInquiryWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.category) where.categorySlug = filters.category;
  if (filters.country) where.country = filters.country;
  if (filters.assignee === "unassigned") where.assignedToId = null;
  else if (filters.assignee) where.assignedToId = filters.assignee;

  if (filters.from || filters.to) {
    where.createdAt = {
      ...(filters.from ? { gte: startOfDayUtc(filters.from) } : {}),
      ...(filters.to ? { lte: endOfDayUtc(filters.to) } : {}),
    };
  }

  if (filters.q) {
    const q = filters.q;
    where.OR = [
      { referenceCode: { contains: q } },
      { name: { contains: q } },
      { company: { contains: q } },
      { email: { contains: q } },
      { productName: { contains: q } },
    ];
  }

  return where;
}

const ORDER_BY: Record<
  InquiryListFilters["sort"],
  Prisma.BusinessInquiryOrderByWithRelationInput[]
> = {
  newest: [{ createdAt: "desc" }],
  oldest: [{ createdAt: "asc" }],
  // The lookup table's sortOrder is the pipeline order (NEW..CANCELLED); newest first within a status.
  status: [{ statusRef: { sortOrder: "asc" } }, { createdAt: "desc" }],
};

/**
 * One page of the inquiries list, plus the counts every status tab shows (computed over the same
 * filters minus the status itself, so switching tabs never has to guess a stale count).
 */
export async function listInquiries(
  filters: InquiryListFilters,
  page: PageParams,
): Promise<InquiryListResult> {
  const db = getDb();
  const where = buildWhere(filters);
  const { status: _status, ...withoutStatus } = filters;
  void _status;
  const whereForCounts = buildWhere({ ...withoutStatus, status: "" });

  try {
    const [total, rows, statusGroups] = await Promise.all([
      db.businessInquiry.count({ where }),
      db.businessInquiry.findMany({
        where,
        orderBy: ORDER_BY[filters.sort],
        skip: page.skip,
        take: page.take,
        select: {
          id: true,
          referenceCode: true,
          createdAt: true,
          name: true,
          company: true,
          country: true,
          productName: true,
          categorySlug: true,
          status: true,
          assignedTo: { select: { id: true, name: true } },
          _count: { select: { attachments: true } },
        },
      }),
      db.businessInquiry.groupBy({ by: ["status"], where: whereForCounts, _count: { _all: true } }),
    ]);

    const statusCounts = mergeStatusCounts(
      statusGroups.map((row) => ({ status: row.status, count: row._count._all })),
      INQUIRY_STATUSES,
    );

    return {
      rows: rows.map((row) => ({
        id: row.id,
        referenceCode: row.referenceCode,
        createdAt: row.createdAt,
        name: row.name,
        company: row.company,
        country: row.country,
        productName: row.productName,
        categorySlug: row.categorySlug,
        status: row.status,
        assignedTo: row.assignedTo,
        attachmentCount: row._count.attachments,
      })),
      meta: buildPageMeta(total, page.page, page.pageSize),
      statusCounts,
      total: totalOf(statusCounts),
    };
  } catch (error) {
    throw toDatabaseError(error);
  }
}
