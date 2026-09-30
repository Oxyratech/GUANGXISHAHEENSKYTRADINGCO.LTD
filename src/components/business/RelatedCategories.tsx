import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { DirectionalIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button-link";
import { CATEGORIES } from "@/content/categories";
import type { ServiceSlug } from "@/content/services";
import type { Locale } from "@/i18n/locales";
import { CategoryLinkGrid } from "./CategoryLinkGrid";
import { getRelatedCategories, RELATED_CATEGORIES } from "./service-config";

/**
 * The registered categories a business line applies to. Categories are areas registered for trade,
 * not stock: the shared availability note from `categories` always follows the list, and so does
 * the compliance note when any listed category is regulated.
 */
export async function RelatedCategories({ locale, slug }: { locale: Locale; slug: ServiceSlug }) {
  const [t, categoryNotes] = await Promise.all([
    getTranslations({ locale, namespace: "business" }),
    getTranslations({ locale, namespace: "categories" }),
  ]);
  const categories = getRelatedCategories(slug);
  const mode = RELATED_CATEGORIES[slug].mode;
  const headingId = `${slug}-categories-title`;

  return (
    <Section aria-labelledby={headingId}>
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            id={headingId}
            eyebrow={t("shared.categories.eyebrow")}
            title={t("shared.categories.title")}
            description={
              mode === "all"
                ? t("shared.categories.all", { count: CATEGORIES.length })
                : t(`shared.categories.${mode}`)
            }
          />
          <ButtonLink href="/products" variant="outline">
            {t("shared.categories.viewAll")}
            <DirectionalIcon />
          </ButtonLink>
        </div>
        <div className="mt-10">
          <CategoryLinkGrid locale={locale} categories={categories} dense={categories.length > 6} />
        </div>
        <div className="mt-8 grid max-w-3xl gap-2 text-small text-ink-muted">
          <p>{categoryNotes("availabilityNote")}</p>
          {categories.some((category) => category.regulated) ? (
            <p>{t("shared.categories.regulatedNote")}</p>
          ) : null}
        </div>
      </Container>
    </Section>
  );
}
