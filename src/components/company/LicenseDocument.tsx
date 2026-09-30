import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { COMPANY, LICENSE_IMAGE } from "@/config/company";
import type { Locale } from "@/i18n/locales";
import { formatLongDate } from "./format";
import { LicenseViewer } from "./LicenseViewer";

/**
 * The license image with its caption. Only the viewer's own messages reach the browser: the
 * client provider is given `companyInfo.license.viewer` and nothing else of the catalogue.
 */
export async function LicenseDocument({ locale }: { locale: Locale }) {
  const [t, messages] = await Promise.all([
    getTranslations({ locale, namespace: "companyInfo" }),
    getMessages({ locale }),
  ]);

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={{ companyInfo: { license: { viewer: messages.companyInfo.license.viewer } } }}
    >
      <LicenseViewer
        image={LICENSE_IMAGE}
        caption={t.rich("license.caption", {
          titleZh: COMPANY.licenseTitleZh,
          date: formatLongDate(COMPANY.licenseIssuedOn, locale),
          zh: (chunks) => <span lang="zh-CN">{chunks}</span>,
        })}
      />
    </NextIntlClientProvider>
  );
}
