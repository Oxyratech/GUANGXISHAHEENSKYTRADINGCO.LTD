import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { DirectionalIcon } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { ButtonLink } from "@/components/ui/button-link";
import { COMPANY } from "@/config/company";
import type { Locale } from "@/i18n/locales";
import { cn } from "@/lib/utils";
import { formatLongDate, formatRegisteredCapital } from "../format";

function Tile({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid content-start gap-1 bg-white p-5", className)}>
      <dt className="text-caption text-ink-subtle">{label}</dt>
      <dd className="text-body font-medium text-navy-900">{children}</dd>
    </div>
  );
}

/** Registered Information: the headline registration facts and the way to the full page. */
export async function RegisteredSummary({ locale }: { locale: Locale }) {
  const [t, info] = await Promise.all([
    getTranslations({ locale, namespace: "about" }),
    getTranslations({ locale, namespace: "companyInfo" }),
  ]);

  return (
    <Section aria-labelledby="registered-heading">
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="grid content-start gap-6 lg:col-span-5">
            <SectionHeading
              id="registered-heading"
              eyebrow={t("registered.eyebrow")}
              title={t("registered.title")}
              description={t("registered.description")}
            />
            <ButtonLink
              href="/company-information"
              variant="outline"
              className="justify-self-start"
            >
              {t("registered.link")}
              <DirectionalIcon />
            </ButtonLink>
          </div>
          <dl className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:col-span-7">
            <Tile label={info("facts.nameEn")}>
              <bdi lang="en" dir="ltr">
                {COMPANY.legalNameEn}
              </bdi>
            </Tile>
            <Tile label={info("facts.nameZh")}>
              <span lang="zh-CN">{COMPANY.legalNameZh}</span>
            </Tile>
            <Tile label={info("facts.capital")}>
              <bdi dir="ltr" className="whitespace-nowrap">
                {formatRegisteredCapital()}
              </bdi>{" "}
              <span lang="zh-CN" className="text-small font-normal text-ink-muted">
                {COMPANY.registeredCapital.zh}
              </span>
            </Tile>
            <Tile label={t("labels.established")}>
              <time dateTime={COMPANY.establishedOn}>
                {formatLongDate(COMPANY.establishedOn, locale)}
              </time>
            </Tile>
            <Tile label={t("labels.registeredIn")} className="sm:col-span-2">
              {t("location")}
            </Tile>
          </dl>
        </div>
      </Container>
    </Section>
  );
}
