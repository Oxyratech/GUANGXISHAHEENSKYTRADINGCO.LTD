// Shared helpers for the legal page tests. Not imported by app code.
import { createTranslator } from "next-intl";
import type { ComponentProps } from "react";
import type { Locale } from "@/i18n/locales";
import arCommon from "@/messages/ar/common.json";
import arLegal from "@/messages/ar/legal.json";
import enCommon from "@/messages/en/common.json";
import enLegal from "@/messages/en/legal.json";
import zhCommon from "@/messages/zh/common.json";
import zhLegal from "@/messages/zh/legal.json";

export const MESSAGES = {
  en: { common: enCommon, legal: enLegal },
  zh: { common: zhCommon, legal: zhLegal },
  ar: { common: arCommon, legal: arLegal },
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
 * Stand-in for "next-intl/server": the real catalogue of the requested locale.
 *   vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);
 */
export const intlServerMock = {
  getTranslations: async ({ locale, namespace }: { locale: Locale; namespace: string }) =>
    createTranslator({ locale, messages: MESSAGES[locale], namespace } as never),
  getMessages: async ({ locale }: { locale: Locale }) => MESSAGES[locale],
  setRequestLocale: () => {},
};
