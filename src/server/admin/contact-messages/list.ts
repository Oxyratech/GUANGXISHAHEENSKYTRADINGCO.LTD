import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { CONTACT_MESSAGE_STATUSES } from "@/lib/domain/statuses";
import { getDb } from "@/server/db";
import { toDatabaseError } from "@/server/db/errors";
import { buildPageMeta, type PageMeta, type PageParams } from "@/server/admin/pagination";
import {
  mergeStatusCounts,
  totalOf,
  type StatusCount,
} from "@/server/admin/dashboard/status-counts";
import type { ContactListFilters } from "./filters";

export interface ContactListRow {
  id: string;
  referenceCode: string;
  createdAt: Date;
  name: string;
  company: string | null;
  country: string | null;
  status: string;
  handledBy: { id: string; name: string } | null;
}

export interface ContactListResult {
  rows: ContactListRow[];
  meta: PageMeta;
  statusCounts: StatusCount[];
  total: number;
}

function buildWhere(filters: ContactListFilters): Prisma.ContactMessageWhereInput {
  const where: Prisma.ContactMessageWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.q) {
    const q = filters.q;
    where.OR = [
      { referenceCode: { contains: q } },
      { name: { contains: q } },
      { company: { contains: q } },
      { email: { contains: q } },
    ];
  }
  return where;
}

const ORDER_BY: Record<
  ContactListFilters["sort"],
  Prisma.ContactMessageOrderByWithRelationInput[]
> = {
  newest: [{ createdAt: "desc" }],
  oldest: [{ createdAt: "asc" }],
};

/** One page of the contact messages list, plus the counts every status tab shows. */
export async function listContactMessages(
  filters: ContactListFilters,
  page: PageParams,
): Promise<ContactListResult> {
  const db = getDb();
  const where = buildWhere(filters);
  const whereForCounts = buildWhere({ ...filters, status: "" });

  try {
    const [total, rows, statusGroups] = await Promise.all([
      db.contactMessage.count({ where }),
      db.contactMessage.findMany({
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
          status: true,
          handledBy: { select: { id: true, name: true } },
        },
      }),
      db.contactMessage.groupBy({ by: ["status"], where: whereForCounts, _count: { _all: true } }),
    ]);

    const statusCounts = mergeStatusCounts(
      statusGroups.map((row) => ({ status: row.status, count: row._count._all })),
      CONTACT_MESSAGE_STATUSES,
    );

    return {
      rows,
      meta: buildPageMeta(total, page.page, page.pageSize),
      statusCounts,
      total: totalOf(statusCounts),
    };
  } catch (error) {
    throw toDatabaseError(error);
  }
}
