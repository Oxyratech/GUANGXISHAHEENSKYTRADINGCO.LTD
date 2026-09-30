import { getTranslations } from "next-intl/server";
import { Check } from "@/components/icons";
import { SmartLink } from "@/components/ui/smart-link";
import { BUSINESS_SCOPE_ITEMS } from "@/config/business-scope";
import { SERVICES } from "@/content/services";
import type { Locale } from "@/i18n/locales";
import { scopeItemKey } from "./scope-item-key";

/**
 * Which registered scope items each business line relates to, straight from the service registry.
 * Only items that at least one line references get a column, in license order. A tick is never
 * the only signal: every cell says "Related" or "Not related" to assistive technology.
 */
export async function ScopeMatrix({ locale }: { locale: Locale }) {
  const [t, scope, services] = await Promise.all([
    getTranslations({ locale, namespace: "business" }),
    getTranslations({ locale, namespace: "scope" }),
    getTranslations({ locale, namespace: "services" }),
  ]);
  const columns = BUSINESS_SCOPE_ITEMS.filter((item) =>
    SERVICES.some((service) => service.scopeItemIds.includes(item.id)),
  );

  return (
    <div
      role="region"
      aria-label={t("index.relation.matrix.caption")}
      // A region that scrolls sideways must be reachable from the keyboard.
      tabIndex={0}
      className="overflow-x-auto rounded-lg border border-line bg-white shadow-card"
    >
      <table className="w-full min-w-[46rem] border-collapse text-start">
        <caption className="sr-only">{t("index.relation.matrix.caption")}</caption>
        <thead>
          <tr className="bg-surface">
            <th
              scope="col"
              className="sticky start-0 z-10 border-b border-line-strong bg-surface px-4 py-3 text-start align-bottom text-label text-navy-900"
            >
              {t("index.relation.matrix.lineHeader")}
            </th>
            {columns.map((item) => (
              <th
                key={item.id}
                scope="col"
                className="min-w-36 border-b border-line-strong px-3 py-3 text-start align-bottom text-caption font-medium text-ink"
              >
                {scope(scopeItemKey(item.id))}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SERVICES.map((service) => (
            <tr key={service.slug} className="border-b border-line last:border-b-0">
              <th
                scope="row"
                className="sticky start-0 z-10 bg-white px-4 py-3 text-start text-label text-navy-900"
              >
                <SmartLink
                  href={`/business/${service.slug}`}
                  className="underline-offset-4 hover:text-blue-700 hover:underline"
                >
                  {services(`${service.slug}.name`)}
                </SmartLink>
              </th>
              {columns.map((item) => (
                <td key={item.id} className="px-3 py-3 text-start">
                  {service.scopeItemIds.includes(item.id) ? (
                    <>
                      <Check aria-hidden className="size-4 text-blue-700" />
                      <span className="sr-only">{t("index.relation.matrix.related")}</span>
                    </>
                  ) : (
                    <>
                      <span aria-hidden className="text-ink-subtle">
                        &ndash;
                      </span>
                      <span className="sr-only">{t("index.relation.matrix.notRelated")}</span>
                    </>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
