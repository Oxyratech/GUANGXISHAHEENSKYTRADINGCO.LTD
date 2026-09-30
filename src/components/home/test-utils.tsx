// Shared helpers for the homepage tests. Not imported by app code.
import { navigation } from "@/components/site/test-utils";
import { render } from "@testing-library/react";
import { createTranslator, NextIntlClientProvider } from "next-intl";
import {
  cloneElement,
  isValidElement,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from "react";
import type { Locale } from "@/i18n/locales";
import arCategories from "@/messages/ar/categories.json";
import arCommon from "@/messages/ar/common.json";
import arGlobalTrade from "@/messages/ar/globalTrade.json";
import arHome from "@/messages/ar/home.json";
import arProducts from "@/messages/ar/products.json";
import arServices from "@/messages/ar/services.json";
import enCategories from "@/messages/en/categories.json";
import enCommon from "@/messages/en/common.json";
import enGlobalTrade from "@/messages/en/globalTrade.json";
import enHome from "@/messages/en/home.json";
import enProducts from "@/messages/en/products.json";
import enServices from "@/messages/en/services.json";
import zhCategories from "@/messages/zh/categories.json";
import zhCommon from "@/messages/zh/common.json";
import zhGlobalTrade from "@/messages/zh/globalTrade.json";
import zhHome from "@/messages/zh/home.json";
import zhProducts from "@/messages/zh/products.json";
import zhServices from "@/messages/zh/services.json";

export {
  blockLinkNavigation,
  navigation,
  navigationMock,
  resetNavigation,
} from "@/components/site/test-utils";

export const MESSAGES = {
  en: {
    home: enHome,
    common: enCommon,
    services: enServices,
    categories: enCategories,
    products: enProducts,
    globalTrade: enGlobalTrade,
  },
  zh: {
    home: zhHome,
    common: zhCommon,
    services: zhServices,
    categories: zhCategories,
    products: zhProducts,
    globalTrade: zhGlobalTrade,
  },
  ar: {
    home: arHome,
    common: arCommon,
    services: arServices,
    categories: arCategories,
    products: arProducts,
    globalTrade: arGlobalTrade,
  },
};

/**
 * Stand-in for "next-intl/server": the real catalogues, translated by the same engine the app uses.
 * A missing message throws instead of quietly rendering its key, so a page that asks for a key the
 * catalogue lacks fails its test.
 *   vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);
 */
export const intlServerMock = {
  getTranslations: async (options: string | { locale?: Locale; namespace: string }) => {
    const { locale = navigation.locale, namespace } =
      typeof options === "string" ? { namespace: options } : options;
    return createTranslator({
      locale,
      messages: MESSAGES[locale],
      namespace,
      onError: (error: Error) => {
        throw error;
      },
    } as never);
  },
  getLocale: vi.fn(async () => navigation.locale),
  setRequestLocale: vi.fn(),
};

type Props = Record<string, unknown>;

/** Async function components are Server Components; React's DOM renderer cannot run them. */
function isAsyncComponent(type: unknown): type is (props: Props) => Promise<ReactNode> {
  return typeof type === "function" && type.constructor.name === "AsyncFunction";
}

async function resolveValue(value: unknown): Promise<unknown> {
  return Array.isArray(value) || isValidElement(value) ? resolveNode(value as ReactNode) : value;
}

/**
 * Runs every async Server Component in a tree, the way the server does before it streams HTML, and
 * returns a tree that only holds host elements and synchronous components (client components
 * included). Props that carry elements are resolved too.
 */
export async function resolveNode(node: ReactNode): Promise<ReactNode> {
  if (Array.isArray(node)) return Promise.all(node.map(resolveNode));
  if (!isValidElement(node)) return node;

  const element = node as ReactElement<Props>;
  if (isAsyncComponent(element.type)) return resolveNode(await element.type(element.props));

  const entries = await Promise.all(
    Object.entries(element.props).map(async ([key, value]) => [key, await resolveValue(value)]),
  );
  return cloneElement(element, Object.fromEntries(entries));
}

/** Renders a Server Component (or a tree that contains some) with the catalogues of `locale`. */
export async function renderServer(node: ReactNode, locale: Locale = "en") {
  navigation.locale = locale;
  const tree = await resolveNode(node);
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
        {children}
      </NextIntlClientProvider>
    );
  }
  return render(<>{tree}</>, { wrapper: Wrapper as ComponentType<{ children: ReactNode }> });
}
