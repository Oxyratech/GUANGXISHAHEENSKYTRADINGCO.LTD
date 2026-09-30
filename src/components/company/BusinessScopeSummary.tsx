import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/icons";
import type { Locale } from "@/i18n/locales";
import { cn } from "@/lib/utils";
import { getScopeGroupIcon, loadScopeGroups } from "./scope-model";

/**
 * The registered business scope in short: each group of the license with its one-line description
 * and how many registered items it holds. Groups are headed with h3, so place it under an h2.
 * The full list of items is <BusinessScopeDetail /> on the company information page.
 */
export async function BusinessScopeSummary({ locale }: { locale: Locale }) {
  const [groups, t] = await Promise.all([
    loadScopeGroups(locale),
    getTranslations({ locale, namespace: "about" }),
  ]);

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map(({ group, name, description, items }) => {
        // Trade and agency is the core of the scope and the only group that is not a product
        // category: it takes a full row, which also leaves the twelve categories in complete rows.
        const core = group === "trade-services";
        return (
          <li
            key={group}
            className={cn(
              "flex items-start gap-4 rounded-lg border p-5 shadow-card",
              core
                ? "border-blue-200 bg-blue-50 sm:col-span-2 lg:col-span-3"
                : "border-line bg-white",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-md text-blue-700",
                core ? "bg-white" : "bg-blue-50",
              )}
            >
              <Icon name={getScopeGroupIcon(group)} />
            </span>
            <div className="grid min-w-0 content-start gap-1">
              <h3 className="text-label text-navy-900">{name}</h3>
              <p className="text-small text-ink-muted">{description}</p>
              <p className={cn("mt-1 text-caption", core ? "text-ink-muted" : "text-ink-subtle")}>
                {t("scope.groupItems", { count: items.length, countLabel: String(items.length) })}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
