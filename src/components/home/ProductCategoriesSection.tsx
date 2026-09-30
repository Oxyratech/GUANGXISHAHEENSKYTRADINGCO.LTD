import { getTranslations } from "next-intl/server";
import { DirectionalIcon } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { AvailabilityNote } from "@/components/products/AvailabilityNote";
import { CategoryCard } from "@/components/products/CategoryCard";
import { ButtonLink } from "@/components/ui/button-link";
import { CATEGORIES } from "@/content/categories";
import type { Locale } from "@/i18n/locales";

/**
 * Product categories available for sourcing and trade: all twelve, drawn from the registered
 * business scope. Categories are areas open to trade, not a claim of current stock (AvailabilityNote).
 */
export async function ProductCategoriesSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "home" });

  return (
    <Section tone="muted" aria-labelledby="home-categories-title">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            id="home-categories-title"
            eyebrow={t("categories.eyebrow")}
            title={t("categories.title")}
            description={t("categories.description", { count: CATEGORIES.length })}
          />
          <ButtonLink href="/products" variant="outline">
            {t("categories.cta")}
            <DirectionalIcon />
          </ButtonLink>
        </div>
        <Reveal as="ul" className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((category) => (
            <li key={category.slug} className="flex">
              <CategoryCard slug={category.slug} locale={locale} headingLevel={3} compact />
            </li>
          ))}
        </Reveal>
        <AvailabilityNote locale={locale} className="mt-8 max-w-3xl" />
      </Container>
    </Section>
  );
}
