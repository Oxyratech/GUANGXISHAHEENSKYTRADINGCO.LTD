import { getTranslations } from "next-intl/server";
import { DirectionalIcon } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { RevealStagger } from "@/components/motion/reveal-stagger";
import { ButtonLink } from "@/components/ui/button-link";
import type { CategorySlug } from "@/content/categories";
import type { Locale } from "@/i18n/locales";
import { CategoryCard } from "./CategoryCard";
import { getNeighbourCategories } from "./related-categories";

/**
 * "Other categories": a compact strip of three neighbouring categories and a link to all of them.
 * Navigation between areas of trade, not a claim that any two categories are commercially related.
 */
export async function OtherCategories({
  slug,
  locale,
  title,
  headingId,
}: {
  slug: CategorySlug;
  locale: Locale;
  title: string;
  /** id of the section heading; unique on the page. */
  headingId: string;
}) {
  const t = await getTranslations({ locale, namespace: "products" });

  return (
    <Section spacing="compact" aria-labelledby={headingId}>
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <SectionHeading as="h2" id={headingId} title={title} />
          <ButtonLink href="/products" variant="link">
            {t("category.others.all")}
            <DirectionalIcon />
          </ButtonLink>
        </div>
        <RevealStagger as="ul" className="mt-8 grid gap-4 sm:grid-cols-3">
          {getNeighbourCategories(slug).map((neighbour) => (
            <li key={neighbour}>
              <CategoryCard slug={neighbour} locale={locale} headingLevel={3} compact />
            </li>
          ))}
        </RevealStagger>
      </Container>
    </Section>
  );
}
