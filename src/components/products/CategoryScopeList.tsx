import { getTranslations } from "next-intl/server";
import { Check } from "@/components/icons";
import { getCategoryScopeItems, type CategorySlug } from "@/content/categories";
import type { Locale } from "@/i18n/locales";
import type { Messages } from "@/i18n/messages";
import { cn } from "@/lib/utils";

/** Ids of the translated scope items; a test checks the registry and the catalogue agree. */
type ScopeItemId = keyof Messages["scope"]["items"];

/**
 * The registered business scope items behind a category, as recorded on the business license.
 * English and Arabic pages show the translated wording with the license's Chinese text beneath it,
 * followed by the qualifier that applies to the whole scope and a note that the Chinese text is
 * authoritative. Registered scope is not a list of products.
 */
export async function CategoryScopeList({
  slug,
  locale,
  className,
}: {
  slug: CategorySlug;
  locale: Locale;
  className?: string;
}) {
  const scope = await getTranslations({ locale, namespace: "scope" });
  const items = getCategoryScopeItems(slug);
  const showOfficialText = locale !== "zh";

  return (
    <div className={cn("grid content-start gap-5", className)}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-3 rounded-lg border border-line bg-white p-4"
          >
            <Check aria-hidden className="mt-1 size-4 shrink-0 text-blue-600" />
            <div className="grid gap-1">
              <span className="text-label text-navy-900">
                {scope(`items.${item.id as ScopeItemId}`)}
              </span>
              {showOfficialText ? (
                <span lang="zh-CN" dir="ltr" className="text-caption text-ink-subtle">
                  <span className="sr-only">{scope("officialTextLabel")}: </span>
                  {item.zh}
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <p className="max-w-3xl text-small text-ink-muted">{scope("qualifier")}</p>
      {showOfficialText ? (
        <p className="max-w-3xl text-caption text-ink-subtle">{scope("translationNote")}</p>
      ) : null}
    </div>
  );
}
