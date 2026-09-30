// Shared helpers for the FAQ tests. Not imported by app code.
import { createTranslator } from "next-intl";
import type { ComponentProps } from "react";
import type { Locale } from "@/i18n/locales";
import arCommon from "@/messages/ar/common.json";
import arFaq from "@/messages/ar/faq.json";
import enCommon from "@/messages/en/common.json";
import enFaq from "@/messages/en/faq.json";
import zhCommon from "@/messages/zh/common.json";
import zhFaq from "@/messages/zh/faq.json";

export const MESSAGES = {
  en: { common: enCommon, faq: enFaq },
  zh: { common: zhCommon, faq: zhFaq },
  ar: { common: arCommon, faq: arFaq },
};

/** The locale the mocked modules answer for; tests set it before rendering. */
export const current = { locale: "en" as Locale };

/**
 * Stand-in for "@/i18n/navigation": links get their locale prefix the way the real Link does it.
 *   vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);
 */
export const navigationMock = {
  Link: ({
    href,
    locale,
    prefetch: _prefetch,
    ...props
  }: ComponentProps<"a"> & { href: string; locale?: string; prefetch?: boolean }) => (
    <a {...props} href={`/${locale ?? current.locale}${href === "/" ? "" : href}`} />
  ),
};

/**
 * Stand-in for "next-intl/server": the real English, Chinese or Arabic catalogue, formatted by the
 * engine the app uses.
 *   vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);
 */
export const intlServerMock = {
  getTranslations: async ({ locale, namespace }: { locale: Locale; namespace: string }) =>
    createTranslator({ locale, messages: MESSAGES[locale], namespace } as never),
  setRequestLocale: () => {},
};
