import { CONTACT_MESSAGE_STATUSES, type ContactMessageStatus } from "@/lib/domain/statuses";
import type { RawSearchParams } from "@/server/admin/pagination";

/** URL-driven filters for the contact messages list, parsed the same forgiving way as inquiries. */

export const CONTACT_SORTS = ["newest", "oldest"] as const;
export type ContactSort = (typeof CONTACT_SORTS)[number];

export interface ContactListFilters {
  q: string;
  status: ContactMessageStatus | "";
  sort: ContactSort;
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function isContactStatus(value: string): value is ContactMessageStatus {
  return (CONTACT_MESSAGE_STATUSES as readonly string[]).includes(value);
}

export function parseContactListFilters(searchParams: RawSearchParams): ContactListFilters {
  const status = first(searchParams.status).toUpperCase();
  const sort = first(searchParams.sort);

  return {
    q: first(searchParams.q).slice(0, 200),
    status: isContactStatus(status) ? status : "",
    sort: (CONTACT_SORTS as readonly string[]).includes(sort) ? (sort as ContactSort) : "newest",
  };
}
