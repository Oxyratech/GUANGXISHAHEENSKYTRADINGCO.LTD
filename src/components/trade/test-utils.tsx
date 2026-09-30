// Shared helpers for the Global Trade tests. Not imported by app code.
import { createTranslator } from "next-intl";
import { cloneElement, isValidElement, type ComponentProps, type ReactNode } from "react";
import type { Locale } from "@/i18n/locales";
import arCommon from "@/messages/ar/common.json";
import arGlobalTrade from "@/messages/ar/globalTrade.json";
import enCommon from "@/messages/en/common.json";
import enGlobalTrade from "@/messages/en/globalTrade.json";
import zhCommon from "@/messages/zh/common.json";
import zhGlobalTrade from "@/messages/zh/globalTrade.json";

export const MESSAGES = {
  en: { common: enCommon, globalTrade: enGlobalTrade },
  zh: { common: zhCommon, globalTrade: zhGlobalTrade },
  ar: { common: arCommon, globalTrade: arGlobalTrade },
};

/** The locale of the "request": set by the mocked setRequestLocale, read when none is passed. */
const request = { locale: "en" as Locale };

export function setRequestLocaleForTest(locale: Locale) {
  request.locale = locale;
}

/**
 * Stand-in for "@/i18n/navigation": links are prefixed with the request locale like the real Link.
 *   vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);
 */
export const navigationMock = {
  Link: ({
    href,
    locale,
    prefetch: _prefetch,
    ...props
  }: ComponentProps<"a"> & { href: string; locale?: string; prefetch?: boolean }) => (
    <a {...props} href={`/${locale ?? request.locale}${href === "/" ? "" : href}`} />
  ),
};

/**
 * Stand-in for "next-intl/server": the real catalogues, translated by the same engine as the app.
 *   vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);
 */
export const intlServerMock = {
  getTranslations: async (options: string | { locale?: Locale; namespace: string }) => {
    const { locale = request.locale, namespace } =
      typeof options === "string" ? { namespace: options } : options;
    return createTranslator({ locale, messages: MESSAGES[locale], namespace } as never);
  },
  setRequestLocale: (locale: Locale) => setRequestLocaleForTest(locale),
};

type Props = Record<string, unknown>;

const isAsyncComponent = (type: unknown): type is (props: Props) => Promise<ReactNode> =>
  typeof type === "function" && type.constructor.name === "AsyncFunction";

/**
 * Expands the async (server) components of a tree, wherever they sit in it (children or any prop
 * such as `aside`), so the client test renderer can draw a whole page. Sync components are left
 * for React to render.
 */
export async function resolveServerTree(node: ReactNode): Promise<ReactNode> {
  if (Array.isArray(node)) return Promise.all(node.map(resolveServerTree));
  if (!isValidElement<Props>(node)) return node;

  if (isAsyncComponent(node.type)) return resolveServerTree(await node.type(node.props));

  const { children, ...rest } = node.props;
  const resolvedRest: Props = {};
  for (const [key, value] of Object.entries(rest)) {
    resolvedRest[key] = await resolveServerTree(value as ReactNode);
  }
  if (children === undefined) return cloneElement(node, resolvedRest);
  const resolvedChildren = await resolveServerTree(children as ReactNode);
  return Array.isArray(resolvedChildren)
    ? cloneElement(node, resolvedRest, ...resolvedChildren)
    : cloneElement(node, resolvedRest, resolvedChildren);
}

/** Heading levels of a rendered page, in document order. */
export function headingLevels(root: ParentNode): number[] {
  return [...root.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((h) => Number(h.tagName[1]));
}

/** True when the outline never skips a level going down (h1 to h3 is a skip; h3 to h2 is fine). */
export function hasValidOutline(levels: readonly number[]): boolean {
  return levels.every((level, index) =>
    index === 0 ? level === 1 : level <= levels[index - 1]! + 1,
  );
}

/**
 * Internal targets a rendered page links to, without locale prefix, query or hash: "/inquiry",
 * "/global-trade/how-it-works". In-page anchors ("#step-x") are not returned.
 */
export function internalPaths(root: ParentNode, locale: Locale): string[] {
  const prefix = `/${locale}`;
  return [...root.querySelectorAll("a[href]")]
    .map((a) => a.getAttribute("href") ?? "")
    .filter((href) => href.startsWith(prefix))
    .map((href) => href.slice(prefix.length).split(/[?#]/, 1)[0] || "/");
}

/** Parsed content of every application/ld+json script in a rendered page. */
export function jsonLdOf(root: ParentNode): Record<string, unknown>[] {
  return [...root.querySelectorAll('script[type="application/ld+json"]')].flatMap((script) => {
    const data: unknown = JSON.parse(script.textContent ?? "null");
    return (Array.isArray(data) ? data : [data]) as Record<string, unknown>[];
  });
}
