import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locales";
import { cn } from "@/lib/utils";
import type { ProductSpecificationRow } from "@/server/products";
import { contentLanguageProps } from "./content-language";

/**
 * Specifications as a real table: each label is a row header, each value a cell, and the caption
 * names the product. The visible heading belongs to the page, so the caption and the column
 * headers are for assistive technology. Renders nothing without specifications.
 */
export async function SpecificationTable({
  specifications,
  name,
  locale,
  className,
}: {
  specifications: readonly ProductSpecificationRow[];
  name: string;
  locale: Locale;
  className?: string;
}) {
  if (specifications.length === 0) return null;
  const t = await getTranslations({ locale, namespace: "products" });

  return (
    <div className={cn("overflow-hidden rounded-lg border border-line bg-white", className)}>
      <table className="w-full border-collapse text-small">
        <caption className="sr-only">{t("specifications.caption", { name })}</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">{t("specifications.specification")}</th>
            <th scope="col">{t("specifications.value")}</th>
          </tr>
        </thead>
        <tbody>
          {specifications.map((spec, index) => {
            const language = contentLanguageProps(spec.contentLocale, locale);
            return (
              <tr key={`${index}-${spec.label}`} className="border-b border-line last:border-b-0">
                <th
                  scope="row"
                  {...language}
                  className="w-2/5 px-4 py-3 text-start align-top font-medium wrap-break-word text-navy-900"
                >
                  {spec.label}
                </th>
                <td {...language} className="px-4 py-3 align-top wrap-break-word text-ink">
                  {spec.value}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
