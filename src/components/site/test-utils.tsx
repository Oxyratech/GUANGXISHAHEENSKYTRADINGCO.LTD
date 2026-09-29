// Shared helpers for the site chrome tests. Not imported by app code.
import { render } from "@testing-library/react";
import { createTranslator, NextIntlClientProvider } from "next-intl";
import type { ComponentProps, ReactElement, ReactNode } from "react";
import type { Locale } from "@/i18n/locales";
import arCategories from "@/messages/ar/categories.json";
import arCommon from "@/messages/ar/common.json";
import arErrors from "@/messages/ar/errors.json";
import arServices from "@/messages/ar/services.json";
import enCategories from "@/messages/en/categories.json";
import enCommon from "@/messages/en/common.json";
import enErrors from "@/messages/en/errors.json";
import enServices from "@/messages/en/services.json";
import zhCategories from "@/messages/zh/categories.json";
import zhCommon from "@/messages/zh/common.json";
import zhErrors from "@/messages/zh/errors.json";
import zhServices from "@/messages/zh/services.json";

export { installDomPolyfills } from "@/components/ui/test-utils";

const MESSAGES = {
  en: { common: enCommon, errors: enErrors, services: enServices, categories: enCategories },
  zh: { common: zhCommon, errors: zhErrors, services: zhServices, categories: zhCategories },
  ar: { common: arCommon, errors: arErrors, services: arServices, categories: arCategories },
};

/** Mutable state behind the mocked "@/i18n/navigation": tests set the page and inspect navigation. */
export const navigation = {
  locale: "en" as Locale,
  pathname: "/",
  replace: vi.fn(),
  push: vi.fn(),
};

export function resetNavigation(pathname = "/", locale: Locale = "en") {
  navigation.locale = locale;
  navigation.pathname = pathname;
  navigation.replace.mockReset();
  navigation.push.mockReset();
}

/**
 * Stand-in for "@/i18n/navigation" (next-intl's real module cannot be imported by Vitest). Links
 * are prefixed with their locale the way the real Link does it.
 *   vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);
 */
export const navigationMock = {
  Link: ({
    href,
    locale,
    prefetch: _prefetch,
    ...props
  }: ComponentProps<"a"> & { href: string; locale?: string; prefetch?: boolean }) => (
    <a {...props} href={`/${locale ?? navigation.locale}${href === "/" ? "" : href}`} />
  ),
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: navigation.replace, push: navigation.push }),
};

/**
 * Stand-in for `getTranslations` from "next-intl/server": the real English, Chinese or Arabic
 * catalogue, translated by the same engine the app uses.
 *   vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);
 */
export const intlServerMock = {
  /** Like the real one: a namespace, or `{ locale, namespace }`; the locale defaults to the request's. */
  getTranslations: async (options: string | { locale?: Locale; namespace: string }) => {
    const { locale = navigation.locale, namespace } =
      typeof options === "string" ? { namespace: options } : options;
    return createTranslator({ locale, messages: MESSAGES[locale], namespace } as never);
  },
};

/** The provider is the render wrapper, so `rerender(ui)` keeps the translations. */
export function renderWithIntl(ui: ReactElement, locale: Locale = "en") {
  navigation.locale = locale;
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
        {children}
      </NextIntlClientProvider>
    );
  }
  return render(ui, { wrapper: Wrapper });
}

/**
 * jsdom cannot navigate. Cancels link clicks after React has handled them, so tests stay quiet;
 * returns the function that removes the listener.
 */
export function blockLinkNavigation() {
  const cancel = (event: Event) => event.preventDefault();
  document.addEventListener("click", cancel);
  return () => document.removeEventListener("click", cancel);
}
