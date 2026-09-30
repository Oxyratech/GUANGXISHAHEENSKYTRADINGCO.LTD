import { getTranslations } from "next-intl/server";
import { DirectionalIcon } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { ButtonLink } from "@/components/ui/button-link";
import { SmartLink } from "@/components/ui/smart-link";
import type { ServiceSlug } from "@/content/services";
import type { Locale } from "@/i18n/locales";
import { cn } from "@/lib/utils";
import { getAdjacentServices } from "./service-config";

const LINK =
  "group grid min-h-11 content-center gap-1 rounded-lg border border-line bg-white p-4 transition-colors hover:border-line-strong hover:bg-surface";

/** Previous and next business line, with a way back to the overview. */
export async function ServiceNav({ locale, slug }: { locale: Locale; slug: ServiceSlug }) {
  const [t, common, services] = await Promise.all([
    getTranslations({ locale, namespace: "business" }),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "services" }),
  ]);
  const { previous, next } = getAdjacentServices(slug);

  return (
    <nav aria-label={t("shared.nav.label")} className="border-t border-line bg-white">
      <Container>
        <div className="grid gap-4 py-8 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
          {previous ? (
            <SmartLink href={`/business/${previous}`} rel="prev" className={LINK}>
              <span className="inline-flex items-center gap-2 text-caption text-ink-subtle">
                <DirectionalIcon direction="back" size={14} />
                {t("shared.nav.previous")}
              </span>
              <span className="text-label text-navy-900 group-hover:text-blue-700">
                {services(`${previous}.name`)}
              </span>
            </SmartLink>
          ) : (
            <span aria-hidden className="hidden sm:block" />
          )}

          <ButtonLink href="/business" variant="ghost" className="self-center justify-self-center">
            {common("nav.allBusiness")}
          </ButtonLink>

          {next ? (
            <SmartLink
              href={`/business/${next}`}
              rel="next"
              className={cn(LINK, "sm:justify-items-end sm:text-end")}
            >
              <span className="inline-flex items-center gap-2 text-caption text-ink-subtle">
                {t("shared.nav.next")}
                <DirectionalIcon size={14} />
              </span>
              <span className="text-label text-navy-900 group-hover:text-blue-700">
                {services(`${next}.name`)}
              </span>
            </SmartLink>
          ) : (
            <span aria-hidden className="hidden sm:block" />
          )}
        </div>
      </Container>
    </nav>
  );
}
