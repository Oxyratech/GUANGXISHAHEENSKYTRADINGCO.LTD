import type { BreadcrumbItem } from "@/components/ui/breadcrumb";

export interface Crumb {
  name: string;
  /** Pathname without the locale prefix. */
  path: string;
}

/** Breadcrumb component items for a trail: every crumb links except the current page (the last). */
export function toBreadcrumbItems(crumbs: readonly Crumb[]): BreadcrumbItem[] {
  return crumbs.map((crumb, index) =>
    index === crumbs.length - 1 ? { label: crumb.name } : { label: crumb.name, href: crumb.path },
  );
}
