// Shared helpers for the company component and page tests. Not imported by app code.
import { render } from "@testing-library/react";
import { createTranslator, NextIntlClientProvider } from "next-intl";
import {
  cloneElement,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { loadMessages } from "@/i18n/load-messages";
import type { Locale } from "@/i18n/locales";
import arCompanyInfo from "@/messages/ar/companyInfo.json";
import enCompanyInfo from "@/messages/en/companyInfo.json";
import zhCompanyInfo from "@/messages/zh/companyInfo.json";

export const LOCALE_LIST: readonly Locale[] = ["en", "zh", "ar"];

/** The locale the mocked helpers answer for; the render helpers below set it. */
const current = { locale: "en" as Locale };

/**
 * Stand-in for "@/i18n/navigation": links get the locale prefix the real Link adds.
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
 * Stand-in for "next-intl/server" backed by the real catalogues, so tests read the actual en, zh
 * and ar copy.
 *   vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);
 */
export const intlServerMock = {
  getTranslations: async (options: string | { locale?: Locale; namespace: string }) => {
    const { locale = current.locale, namespace } =
      typeof options === "string" ? { namespace: options } : options;
    return createTranslator({ locale, messages: await loadMessages(locale), namespace } as never);
  },
  getMessages: async ({ locale = current.locale }: { locale?: Locale } = {}) =>
    loadMessages(locale),
  setRequestLocale: () => {},
};

const COMPANY_INFO = { en: enCompanyInfo, zh: zhCompanyInfo, ar: arCompanyInfo };

/** Renders a client component with the `companyInfo` messages of one locale. */
export function renderWithCompanyIntl(ui: ReactElement, locale: Locale = "en") {
  current.locale = locale;
  return render(
    <NextIntlClientProvider locale={locale} messages={{ companyInfo: COMPANY_INFO[locale] }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const isAsyncComponent = (type: unknown): type is (props: unknown) => Promise<ReactNode> =>
  typeof type === "function" && Object.prototype.toString.call(type) === "[object AsyncFunction]";

/**
 * Runs every async Server Component in a tree, the way the server would, and returns plain
 * elements that Testing Library can render. Async components may sit in `children` or in any
 * element-valued prop (PageHero's `aside`, `actions`, ...).
 */
export async function resolveServerTree(node: ReactNode): Promise<ReactNode> {
  if (Array.isArray(node)) return Promise.all(node.map(resolveServerTree));
  if (!isValidElement<Record<string, unknown>>(node)) return node;
  if (isAsyncComponent(node.type)) return resolveServerTree(await node.type(node.props));

  const { children, ...others } = node.props;
  const props: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(others)) {
    if (Array.isArray(value) || isValidElement(value)) {
      props[key] = await resolveServerTree(value as ReactNode);
    }
  }
  if (children === undefined) return cloneElement(node, props);
  const resolved = await resolveServerTree(children as ReactNode);
  // Static children go back as separate arguments, as JSX passes them, so React wants no keys.
  return Array.isArray(resolved) && !isKeyedList(children)
    ? cloneElement(node, props, ...resolved)
    : cloneElement(node, props, resolved);
}

/** A list built with .map(): every element carries a key. */
function isKeyedList(children: unknown): boolean {
  return (
    Array.isArray(children) &&
    children.length > 0 &&
    children.every((child) => isValidElement(child) && child.key !== null)
  );
}

/** Renders a Server Component (or a whole page) for one locale. */
export async function renderServer(node: ReactNode, locale: Locale = "en") {
  current.locale = locale;
  return render(<>{await resolveServerTree(node)}</>);
}

/** Heading levels of a rendered page, in document order. */
export function headingLevels(container: HTMLElement): number[] {
  return [...container.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((heading) =>
    Number(heading.tagName.slice(1)),
  );
}

/** Site paths (no locale prefix, no fragment) of every locale-aware link in a rendered page. */
export function internalPaths(container: HTMLElement, locale: Locale): string[] {
  const prefix = `/${locale}`;
  return [...container.querySelectorAll<HTMLAnchorElement>("a[href]")]
    .map((link) => link.getAttribute("href") ?? "")
    .filter(
      (href) => href === prefix || href.startsWith(`${prefix}/`) || href.startsWith(`${prefix}#`),
    )
    .map((href) => href.slice(prefix.length).split("#")[0] || "/");
}

/** The parsed JSON-LD objects of a rendered page. */
export function jsonLdOf(container: HTMLElement): Record<string, unknown>[] {
  return [...container.querySelectorAll('script[type="application/ld+json"]')].flatMap((script) => {
    const parsed: unknown = JSON.parse(script.textContent ?? "null");
    return (Array.isArray(parsed) ? parsed : [parsed]) as Record<string, unknown>[];
  });
}
