import { NextIntlClientProvider } from "next-intl";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Analytics } from "@/components/analytics/Analytics";
import { CLIENT_NAMESPACES } from "@/components/site/client-messages";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { SkipLink } from "@/components/site/SkipLink";
import { DirectionProvider } from "@/components/ui/direction";
import { Toaster } from "@/components/ui/toast";
import { loadMessages } from "@/i18n/load-messages";
import type { Locale } from "@/i18n/locales";
import { JsonLd } from "@/lib/seo";
import type { PublicContactChannels } from "@/server/settings/contact-channels";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  setRequestLocale: vi.fn(),
  getPublicContactChannels: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/site/test-utils")).navigationMock,
);
vi.mock("@/lib/fonts", () => ({
  plexSans: { variable: "font-plex-sans" },
  plexArabic: { variable: "font-plex-arabic" },
}));
vi.mock("@/server/settings", () => ({ getPublicContactChannels: mocks.getPublicContactChannels }));
vi.mock("next/script", () => ({ default: () => null }));
vi.mock("next-intl/server", async () => ({
  ...(await import("@/components/site/test-utils")).intlServerMock,
  setRequestLocale: mocks.setRequestLocale,
  getMessages: ({ locale }: { locale: Locale }) => loadMessages(locale),
}));

import LocaleLayout from "./layout";

/** Every element of a rendered tree, in document order. Components are not expanded. */
type TreeElement = ReactElement<Record<string, unknown>>;

function elements(node: ReactNode): TreeElement[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  return [node, ...elements(node.props.children as ReactNode)];
}

async function renderLayout(locale: string, channels: PublicContactChannels = {}) {
  mocks.getPublicContactChannels.mockResolvedValue(channels);
  const tree = await LocaleLayout({
    children: <p>page</p>,
    params: Promise.resolve({ locale }),
  } as never);
  return { tree: tree as ReactElement<Record<string, unknown>>, all: elements(tree) };
}

const ofType = (all: TreeElement[], type: unknown) =>
  all.filter((element) => element.type === type);

beforeEach(() => {
  mocks.setRequestLocale.mockClear();
  mocks.notFound.mockClear();
});

describe("locale layout", () => {
  it.each([
    ["en", "en", "ltr"],
    ["zh", "zh-CN", "ltr"],
    ["ar", "ar", "rtl"],
  ] as const)(
    "owns <html> with the right language and direction for %s",
    async (locale, lang, dir) => {
      const { tree } = await renderLayout(locale);

      expect(tree.type).toBe("html");
      expect(tree.props.lang).toBe(lang);
      expect(tree.props.dir).toBe(dir);
      expect(tree.props.className).toContain("font-plex-sans");
      expect(mocks.setRequestLocale).toHaveBeenCalledWith(locale);
    },
  );

  it("renders the 404 for an unsupported locale", async () => {
    await expect(renderLayout("xx")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("puts the skip link first, then the header, the main landmark and the footer", async () => {
    const { all } = await renderLayout("en");

    const order = [SkipLink, Header, "main", Footer].map((type) =>
      all.findIndex((el) => el.type === type),
    );
    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("makes <main id=main> the focus target of the skip link", async () => {
    const { all } = await renderLayout("en");

    const [main] = ofType(all, "main");
    expect(main.props.id).toBe("main");
    expect(main.props.tabIndex).toBe(-1);
    const [skip] = ofType(all, SkipLink);
    expect(skip.props.label).toBe("Skip to main content");
  });

  it("gives the header and footer the locale, and the footer the configured channels", async () => {
    const channels = { email: "sales@example.com" };
    const { all } = await renderLayout("zh", channels);

    expect(ofType(all, Header)[0].props.locale).toBe("zh");
    expect(ofType(all, Footer)[0].props).toMatchObject({ locale: "zh", channels });
  });

  it("ships only the namespaces client components need", async () => {
    const { all } = await renderLayout("en");

    const [provider] = ofType(all, NextIntlClientProvider);
    expect(provider.props.locale).toBe("en");
    expect(Object.keys(provider.props.messages as object).sort()).toEqual(
      [...CLIENT_NAMESPACES].sort(),
    );
  });

  it("mounts the direction provider, the toaster and analytics", async () => {
    const { all } = await renderLayout("ar");

    expect(ofType(all, DirectionProvider)[0].props.dir).toBe("rtl");
    expect(ofType(all, Toaster)[0].props).toMatchObject({
      viewportLabel: "الإشعارات",
      closeLabel: "إغلاق",
    });
    expect(ofType(all, Analytics)).toHaveLength(1);
  });

  it("describes the organisation and the website, with no contact point when none is configured", async () => {
    const { all } = await renderLayout("en", {});

    const [jsonLd] = ofType(all, JsonLd);
    const data = jsonLd.props.data as Record<string, unknown>[];
    expect(data.map((entry) => entry["@type"])).toEqual(["Organization", "WebSite"]);
    expect(data[0]).not.toHaveProperty("contactPoint");
  });

  it("adds a contact point to the organisation only from configured channels", async () => {
    const { all } = await renderLayout("en", {
      email: "sales@example.com",
      phone: "+86 771 555 0100",
    });

    const [jsonLd] = ofType(all, JsonLd);
    const [organization] = jsonLd.props.data as Record<string, unknown>[];
    expect(organization.contactPoint).toMatchObject({
      email: "sales@example.com",
      telephone: "+86 771 555 0100",
    });
  });
});
