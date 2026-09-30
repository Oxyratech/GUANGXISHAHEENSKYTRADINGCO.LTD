import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { getUnofficialTranslations } from "@/components/company/unofficial-translations";
import { DirectionalIcon } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { ButtonLink } from "@/components/ui/button-link";
import { SmartLink } from "@/components/ui/smart-link";
import { COMPANY, LICENSE_IMAGE } from "@/config/company";
import type { Locale } from "@/i18n/locales";

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-line py-3 first:pt-0 last:border-0 last:pb-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-label text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-body text-ink">{children}</dd>
    </div>
  );
}

/**
 * A concise excerpt of the registered facts, with the unaltered license image linking to the full
 * company information page (do not crop or overlay it: this is a preview thumbnail, not a document).
 */
export async function CompanyInfoSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "home" });
  const translations = getUnofficialTranslations(locale);

  return (
    <Section tone="muted" aria-labelledby="home-company-title">
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <SectionHeading
              id="home-company-title"
              eyebrow={t("company.eyebrow")}
              title={t("company.title")}
              description={t("company.description")}
            />
            <dl className="mt-8 rounded-lg border border-line bg-white p-6 shadow-card">
              <Fact label={t("company.facts.nameEn")}>
                <bdi lang="en" dir="ltr" className="font-medium text-navy-900">
                  {COMPANY.legalNameEn}
                </bdi>
              </Fact>
              <Fact label={t("company.facts.nameZh")}>
                <span lang="zh-CN" className="font-medium text-navy-900">
                  {COMPANY.legalNameZh}
                </span>
              </Fact>
              <Fact label={t("company.facts.representative")}>
                <bdi lang="en" dir="ltr">
                  {COMPANY.legalRepresentative}
                </bdi>
              </Fact>
              <Fact label={t("company.facts.uscc")}>
                <bdi dir="ltr" className="font-mono text-navy-900">
                  {COMPANY.unifiedSocialCreditCode}
                </bdi>
              </Fact>
              <Fact label={t("company.facts.address")}>
                <span lang="zh-CN">{COMPANY.registeredAddressZh}</span>
                {translations ? (
                  <span className="mt-1 block text-small text-ink-muted">
                    <bdi lang="en" dir="ltr">
                      {translations.address}
                    </bdi>
                  </span>
                ) : null}
              </Fact>
            </dl>
            <div className="mt-8">
              <ButtonLink href="/company-information" variant="outline">
                {t("company.cta")}
                <DirectionalIcon />
              </ButtonLink>
            </div>
          </div>
          <div className="lg:col-span-5">
            <SmartLink
              href="/company-information"
              className="block overflow-hidden rounded-lg border border-line shadow-card transition-shadow hover:shadow-raised"
            >
              <Image
                src={LICENSE_IMAGE.src}
                width={LICENSE_IMAGE.width}
                height={LICENSE_IMAGE.height}
                alt={t("company.licenseAlt")}
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="h-auto w-full"
              />
            </SmartLink>
          </div>
        </div>
      </Container>
    </Section>
  );
}
