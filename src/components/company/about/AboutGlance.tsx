import { getTranslations } from "next-intl/server";
import { DirectionalIcon } from "@/components/icons";
import { SmartLink } from "@/components/ui/smart-link";
import { COMPANY } from "@/config/company";
import type { Locale } from "@/i18n/locales";
import { formatLongDate } from "../format";

/** Hero panel of the About page: three facts and a way to the license. Made for the navy hero. */
export async function AboutGlance({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "about" });

  return (
    <section
      aria-labelledby="about-glance"
      className="rounded-lg border border-white/15 bg-white/5 p-6"
    >
      <h2 id="about-glance" className="text-eyebrow text-gold-300">
        {t("hero.glance.heading")}
      </h2>
      <dl className="mt-5 grid gap-5">
        <div className="grid gap-1">
          <dt className="text-caption text-blue-200">{t("labels.established")}</dt>
          <dd className="text-body text-white">
            <time dateTime={COMPANY.establishedOn}>
              {formatLongDate(COMPANY.establishedOn, locale)}
            </time>
          </dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-caption text-blue-200">{t("labels.registeredIn")}</dt>
          <dd className="text-body text-white">{t("location")}</dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-caption text-blue-200">{t("hero.glance.license")}</dt>
          <dd>
            <SmartLink
              href="/company-information#business-license"
              className="inline-flex min-h-11 items-center gap-2 text-label text-white underline underline-offset-4 hover:text-gold-200"
            >
              {t("hero.glance.licenseLink")}
              <DirectionalIcon size={16} />
            </SmartLink>
          </dd>
        </div>
      </dl>
    </section>
  );
}
