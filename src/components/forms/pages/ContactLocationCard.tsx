import { getTranslations } from "next-intl/server";
import { MapPin } from "@/components/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COMPANY } from "@/config/company";
import type { Locale } from "@/i18n/locales";

/**
 * Where the company is registered: the address exactly as on the license (Chinese), an unofficial
 * translation, and the city. There is deliberately no embedded map: it would load a third-party
 * service for every visitor, and the address is all the company has published.
 */
export async function ContactLocationCard({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "contact" });

  return (
    <Card as="section" aria-labelledby="contact-location-title">
      <CardHeader>
        <CardTitle as="h2" id="contact-location-title">
          {t("location.title")}
        </CardTitle>
        <p className="flex items-center gap-2 text-small text-ink-muted">
          <MapPin aria-hidden className="size-4 shrink-0 text-blue-600" />
          {t("location.city")}
        </p>
      </CardHeader>
      <CardContent className="grid content-start gap-5">
        <div className="grid gap-1">
          <p className="text-small text-ink-muted">{t("location.addressLabel")}</p>
          <address className="text-body-lg text-navy-900 not-italic" lang="zh-CN">
            {COMPANY.registeredAddressZh}
          </address>
          <p className="text-small text-ink-muted">
            {t.rich("location.translation", {
              latin: (chunks) => (
                <bdi lang="en" dir="ltr" className="text-ink">
                  {chunks}
                </bdi>
              ),
            })}
          </p>
        </div>
        <p className="text-small text-ink-muted">{t("location.note")}</p>
      </CardContent>
    </Card>
  );
}
