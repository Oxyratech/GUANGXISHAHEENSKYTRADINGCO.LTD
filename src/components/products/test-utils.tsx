// Shared helpers for the product tests. Not imported by app code.
import { render } from "@testing-library/react";
import { createTranslator } from "next-intl";
import {
  cloneElement,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import type { Locale } from "@/i18n/locales";
import arCategories from "@/messages/ar/categories.json";
import arCommon from "@/messages/ar/common.json";
import arProducts from "@/messages/ar/products.json";
import arScope from "@/messages/ar/scope.json";
import enCategories from "@/messages/en/categories.json";
import enCommon from "@/messages/en/common.json";
import enProducts from "@/messages/en/products.json";
import enScope from "@/messages/en/scope.json";
import zhCategories from "@/messages/zh/categories.json";
import zhCommon from "@/messages/zh/common.json";
import zhProducts from "@/messages/zh/products.json";
import zhScope from "@/messages/zh/scope.json";
import type { ProductDetail, ProductSummary } from "@/server/products";

const MESSAGES = {
  en: { common: enCommon, categories: enCategories, products: enProducts, scope: enScope },
  zh: { common: zhCommon, categories: zhCategories, products: zhProducts, scope: zhScope },
  ar: { common: arCommon, categories: arCategories, products: arProducts, scope: arScope },
};

/** The locale the mocked request is in; tests set it before rendering. */
export const navigation = { locale: "en" as Locale };

export function setTestLocale(locale: Locale) {
  navigation.locale = locale;
}

// A test that switches language must not leak it into the next one.
afterEach(() => {
  navigation.locale = "en";
});

/**
 * Stand-in for "@/i18n/navigation": links are prefixed with their locale like the real Link does.
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
};

/**
 * Stand-in for "next-intl/server" backed by the real catalogues. A message that does not exist
 * throws instead of logging, so a missing or misspelled key fails the test that renders it.
 *   vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);
 */
export const intlServerMock = {
  getTranslations: async (options: { locale?: Locale; namespace: string }) => {
    const locale = options.locale ?? navigation.locale;
    return createTranslator({
      locale,
      messages: MESSAGES[locale],
      namespace: options.namespace,
      onError: (error: Error) => {
        throw error;
      },
    } as never);
  },
  getLocale: async () => navigation.locale,
  setRequestLocale: vi.fn(),
};

function isAsyncComponent(type: unknown): type is (props: unknown) => Promise<ReactNode> {
  return typeof type === "function" && type.constructor.name === "AsyncFunction";
}

async function resolveProp(value: unknown): Promise<unknown> {
  return Array.isArray(value) || isValidElement(value) ? resolveServerTree(value) : value;
}

/**
 * Runs async Server Components the way the server does: an element whose component is an async
 * function is called and awaited, and so is everything it returns, in children and in slot props
 * (`title`, `aside`, ...). Client and synchronous components are left for the DOM renderer.
 */
export async function resolveServerTree(node: ReactNode): Promise<ReactNode> {
  if (Array.isArray(node)) return Promise.all(node.map((child) => resolveServerTree(child)));
  if (!isValidElement(node)) return node;

  let element = node as ReactElement<Record<string, unknown>>;
  while (isAsyncComponent(element.type)) {
    const output = await element.type(element.props);
    if (!isValidElement(output)) return resolveServerTree(output);
    element = output as ReactElement<Record<string, unknown>>;
  }

  const entries = await Promise.all(
    Object.entries(element.props).map(async ([key, value]) => [key, await resolveProp(value)]),
  );
  return cloneElement(element, Object.fromEntries(entries));
}

/** Renders a tree that may contain async Server Components. */
export async function renderServer(node: ReactNode) {
  return render((await resolveServerTree(node)) as ReactElement);
}

const IMAGE_ID = "3f2a1c9e-8b47-4d5e-9a10-7c6b5d4e3f21";

export function makeSummary(overrides: Partial<ProductSummary> = {}): ProductSummary {
  return {
    slug: "sample-product",
    categorySlug: "hardware-products",
    name: "Sample product",
    shortDescription: "A short description of the sample product.",
    contentLocale: "en",
    image: null,
    ...overrides,
  };
}

export function makeDetail(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    ...makeSummary(),
    origin: null,
    description: null,
    applications: null,
    packagingInfo: null,
    images: [],
    specifications: [],
    documents: [],
    related: [],
    translatedLocales: ["en"],
    publishedAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-02T00:00:00.000Z",
    ...overrides,
  };
}

export function makeImage(position: number, alt = `Image ${position}`) {
  return {
    src: `/media/${IMAGE_ID.slice(0, -1)}${position}`,
    alt,
    width: 1200,
    height: 900,
  };
}
