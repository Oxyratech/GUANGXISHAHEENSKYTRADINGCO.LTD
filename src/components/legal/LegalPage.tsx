import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Section } from "@/components/layout/section";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import type { Locale } from "@/i18n/locales";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";
import { COOKIES } from "./cookie-inventory";
import { CookieTable } from "./CookieTable";
import { formatLegalDate } from "./legal-date";
import { buildLegalSections } from "./legal-content";
import { LegalDocument } from "./LegalDocument";
import { LEGAL_DOCS, type LegalDocKey } from "./legal-outline";

/** A legal page body: hero with breadcrumb, then the review notice and the document. */
export async function LegalPage({ locale, doc }: { locale: Locale; doc: LegalDocKey }) {
  const [t, common] = await Promise.all([
    getTranslations({ locale, namespace: "legal" }),
    getTranslations({ locale, namespace: "common" }),
  ]);

  const { path } = LEGAL_DOCS[doc];
  const pageName = common(`nav.${doc}`);
  const updatedIso = t(`updated.${doc}`);

  const sections = await buildLegalSections(
    locale,
    doc,
    doc === "cookies"
      ? {
          used: (
            <CookieTable
              caption={t("cookies.table.caption")}
              headers={{
                name: t("cookies.table.headers.name"),
                purpose: t("cookies.table.headers.purpose"),
                setFor: t("cookies.table.headers.setFor"),
                lifetime: t("cookies.table.headers.lifetime"),
              }}
              rows={COOKIES.map(({ id, name }) => ({
                id,
                name,
                purpose: t(`cookies.table.rows.${id}.purpose`),
                setFor: t(`cookies.table.rows.${id}.setFor`),
                lifetime: t(`cookies.table.rows.${id}.lifetime`),
              }))}
            />
          ),
        }
      : {},
  );

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: common("breadcrumb.home"), path: "/" },
          { name: pageName, path },
        ])}
      />
      <PageHero
        eyebrow={t("labels.eyebrow")}
        title={t(`${doc}.hero.title`)}
        description={t(`${doc}.hero.description`)}
        breadcrumb={
          <Breadcrumb
            label={common("a11y.breadcrumb")}
            items={[{ label: common("breadcrumb.home"), href: "/" }, { label: pageName }]}
          />
        }
      />
      <Section spacing="compact">
        <Container>
          <LegalDocument
            sections={sections}
            review={{ title: t("review.title"), body: t("review.body") }}
            updated={t.rich("labels.lastUpdated", {
              date: formatLegalDate(updatedIso, locale),
              time: (chunks) => <time dateTime={updatedIso}>{chunks}</time>,
            })}
            tocTitle={t("labels.toc")}
            printLabel={t("labels.print")}
          />
        </Container>
      </Section>
    </>
  );
}
