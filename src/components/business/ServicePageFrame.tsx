import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { DirectionalIcon } from "@/components/icons";
import { PageHero } from "@/components/layout/page-hero";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ButtonLink } from "@/components/ui/button-link";
import type { ServiceSlug } from "@/content/services";
import type { Locale } from "@/i18n/locales";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";
import { AvailabilityNote } from "./AvailabilityNote";
import { CtaBand } from "./CtaBand";
import { RelatedCategories } from "./RelatedCategories";
import { RelatedScope } from "./RelatedScope";
import { CTA_KEY, inquiryHref } from "./service-config";
import { serviceJsonLd } from "./service-json-ld";
import { ServiceNav } from "./ServiceNav";

/**
 * What every business line page has in common: hero with breadcrumb, structured data, and the
 * closing sequence (registered scope, categories, availability note, call to action, previous and
 * next line). The sections in between are the page's own: `children`.
 *
 * Give the page a white last section: the registered-scope band that follows is muted.
 */
export async function ServicePageFrame({
  locale,
  slug,
  tone,
  size,
  aside,
  children,
}: {
  locale: Locale;
  slug: ServiceSlug;
  tone: "light" | "navy";
  size: "compact" | "expanded";
  aside?: ReactNode;
  children: ReactNode;
}) {
  const [t, common, services] = await Promise.all([
    getTranslations({ locale, namespace: "business" }),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "services" }),
  ]);
  const name = services(`${slug}.name`);
  const inquiry = inquiryHref(slug);
  const navy = tone === "navy";

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(locale, [
            { name: common("breadcrumb.home"), path: "/" },
            { name: common("nav.business"), path: "/business" },
            { name, path: `/business/${slug}` },
          ]),
          serviceJsonLd({ name, description: services(`${slug}.summary`) }),
        ]}
      />
      <PageHero
        tone={tone}
        size={size}
        eyebrow={t("shared.eyebrow")}
        title={name}
        description={t(`pages.${slug}.hero.lead`)}
        breadcrumb={
          <Breadcrumb
            label={common("a11y.breadcrumb")}
            items={[
              { label: common("breadcrumb.home"), href: "/" },
              { label: common("nav.business"), href: "/business" },
              { label: name },
            ]}
          />
        }
        actions={
          <>
            <ButtonLink href={inquiry} variant={navy ? "inverse" : "primary"} size="lg">
              {t(`shared.cta.${CTA_KEY[slug]}`)}
              <DirectionalIcon />
            </ButtonLink>
            <ButtonLink href="/products" variant={navy ? "outline-inverse" : "outline"} size="lg">
              {common("cta.browseProducts")}
            </ButtonLink>
          </>
        }
        aside={aside}
      />

      {children}

      <RelatedScope locale={locale} slug={slug} />
      <RelatedCategories locale={locale} slug={slug} />
      <AvailabilityNote locale={locale} />
      <CtaBand
        headingId={`${slug}-cta-title`}
        title={t("shared.ctaBand.title")}
        description={t("shared.ctaBand.description")}
        primary={{ label: t(`shared.cta.${CTA_KEY[slug]}`), href: inquiry }}
        secondary={{ label: common("cta.contactUs"), href: "/contact" }}
      />
      <ServiceNav locale={locale} slug={slug} />
    </>
  );
}
