// Shared helpers for the news tests. Not imported by app code.
import { createTranslator } from "next-intl";
import type { ComponentProps } from "react";
import type { Locale } from "@/i18n/locales";
import arCommon from "@/messages/ar/common.json";
import arErrors from "@/messages/ar/errors.json";
import arNews from "@/messages/ar/news.json";
import enCommon from "@/messages/en/common.json";
import enErrors from "@/messages/en/errors.json";
import enNews from "@/messages/en/news.json";
import zhCommon from "@/messages/zh/common.json";
import zhErrors from "@/messages/zh/errors.json";
import zhNews from "@/messages/zh/news.json";
import type { ArticleSummary, PublishedArticle } from "@/server/news/types";

const MESSAGES = {
  en: { news: enNews, common: enCommon, errors: enErrors },
  zh: { news: zhNews, common: zhCommon, errors: zhErrors },
  ar: { news: arNews, common: arCommon, errors: arErrors },
};

/**
 * Stand-in for `getTranslations` from "next-intl/server": the real catalogue of the requested
 * locale, translated by the same engine the app uses.
 *   vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);
 */
export const intlServerMock = {
  getTranslations: async ({ locale, namespace }: { locale: Locale; namespace: string }) =>
    createTranslator({ locale, messages: MESSAGES[locale], namespace } as never),
  setRequestLocale: () => {},
};

/**
 * Stand-in for "@/i18n/navigation": links get their locale prefix the way the real Link adds it.
 *   vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);
 */
export const navigationMock = {
  Link: ({
    href,
    locale = "en",
    prefetch: _prefetch,
    ...props
  }: ComponentProps<"a"> & { href: string; locale?: string; prefetch?: boolean }) => (
    <a {...props} href={`/${locale}${href === "/" ? "" : href}`} />
  ),
};

export function makeSummary(overrides: Partial<ArticleSummary> = {}): ArticleSummary {
  return {
    slug: "sample-article",
    title: "Sample article title",
    summary: "A one-paragraph summary of the sample article.",
    publishedAt: "2026-09-30T02:00:00.000Z",
    authorName: null,
    category: null,
    tags: [],
    cover: null,
    ...overrides,
  };
}

export function makeArticle(overrides: Partial<PublishedArticle> = {}): PublishedArticle {
  return {
    ...makeSummary(),
    locale: "en",
    content: "Body text of the sample article.",
    updatedAt: "2026-09-30T03:00:00.000Z",
    alternates: { en: "sample-article" },
    related: [],
    bodyImages: {},
    seo: null,
    ...overrides,
  };
}

/** The JSON-LD objects a rendered page carries. */
export function readJsonLd(container: HTMLElement): Record<string, unknown>[] {
  return [...container.querySelectorAll('script[type="application/ld+json"]')].flatMap((script) => {
    const parsed: unknown = JSON.parse(script.textContent ?? "null");
    return (Array.isArray(parsed) ? parsed : [parsed]) as Record<string, unknown>[];
  });
}
