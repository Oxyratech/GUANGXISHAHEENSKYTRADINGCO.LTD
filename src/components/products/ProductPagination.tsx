import { getTranslations } from "next-intl/server";
import { Pagination } from "@/components/ui/pagination";
import type { Locale } from "@/i18n/locales";
import { buildPageHref } from "./pagination";

/** Product list pagination: crawlable links, page 1 at the plain path, others at ?page=N. */
export async function ProductPagination({
  locale,
  page,
  pageCount,
  basePath,
  className,
}: {
  locale: Locale;
  page: number;
  pageCount: number;
  /** Pathname of the listing without locale or query, e.g. "/products/metal-products". */
  basePath: string;
  className?: string;
}) {
  const t = await getTranslations({ locale, namespace: "products" });
  return (
    <Pagination
      page={page}
      pageCount={pageCount}
      getHref={(target) => buildPageHref(basePath, target)}
      label={t("pagination.label")}
      previousLabel={t("pagination.previous")}
      nextLabel={t("pagination.next")}
      getPageLabel={(target) => t("pagination.page", { page: target })}
      className={className}
    />
  );
}
