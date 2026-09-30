import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { STATIC_PUBLIC_PATHS } from "@/config/routes";
import { TRADE_PROCESS_STEPS } from "@/content/process";
import { LOCALES, type Locale } from "@/i18n/locales";
import { localizedUrl } from "@/lib/seo";
import {
  hasValidOutline,
  headingLevels,
  internalPaths,
  jsonLdOf,
  MESSAGES,
  resolveServerTree,
} from "@/components/trade/test-utils";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/trade/test-utils")).navigationMock,
);
vi.mock(
  "next-intl/server",
  async () => (await import("@/components/trade/test-utils")).intlServerMock,
);

import HowItWorksPage, { generateMetadata } from "./page";

const KNOWN_PATHS = new Set<string>(STATIC_PUBLIC_PATHS);

async function renderPage(locale: Locale) {
  const tree = await HowItWorksPage({ params: Promise.resolve({ locale }) } as never);
  return render(await resolveServerTree(tree));
}

describe.each(LOCALES)("/global-trade/how-it-works in %s", (locale) => {
  const copy = MESSAGES[locale].globalTrade;

  it("has one h1 and a heading outline that never skips a level", async () => {
    const { container } = await renderPage(locale);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(copy.howItWorks.title);
    expect(hasValidOutline(headingLevels(container))).toBe(true);
    expect(container.querySelector("main")).toBeNull();
  });

  it("walks through the eight steps in order, each with what you provide and what we do", async () => {
    await renderPage(locale);

    const steps = screen.getByRole("list", { name: copy.process.label });
    const items = [...steps.children];
    expect(items.map((item) => item.id)).toEqual(TRADE_PROCESS_STEPS.map((id) => `step-${id}`));
    for (const item of items) {
      expect(within(item as HTMLElement).getAllByRole("list")).toHaveLength(2);
    }
  });

  it("jumps from the steps at a glance to the anchors of the steps", async () => {
    const { container } = await renderPage(locale);

    const glance = screen.getByRole("navigation", { name: copy.howItWorks.atAGlance });
    const links = within(glance).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(
      TRADE_PROCESS_STEPS.map((id) => `#step-${id}`),
    );
    for (const link of links) {
      expect(container.querySelector(link.getAttribute("href")!)).not.toBeNull();
    }
  });

  it("states the caveats: typical, confirmed per inquiry, nothing published, regulated goods", async () => {
    await renderPage(locale);

    const notes = screen.getByRole("region", { name: copy.howItWorks.notes.title });
    expect(within(notes).getAllByRole("listitem")).toHaveLength(4);
    expect(within(notes).getByText(copy.howItWorks.notes.typical.description)).toBeInTheDocument();
    expect(within(notes).getByRole("link")).toHaveAttribute("href", `/${locale}/faq`);
  });

  it("links to the FAQ and the inquiry form and only to pages that exist", async () => {
    const { container } = await renderPage(locale);

    const targets = internalPaths(container, locale);
    expect(targets.filter((path) => !KNOWN_PATHS.has(path))).toEqual([]);
    expect(targets).toEqual(expect.arrayContaining(["/faq", "/inquiry", "/global-trade"]));
  });

  it("emits a BreadcrumbList of three levels and no HowTo", async () => {
    const { container } = await renderPage(locale);

    const data = jsonLdOf(container);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ "@type": "BreadcrumbList" });
    expect(data[0]?.itemListElement).toHaveLength(3);
    expect(data[0]?.itemListElement).toMatchObject([
      { item: localizedUrl(locale, "/") },
      { item: localizedUrl(locale, "/global-trade") },
      { item: localizedUrl(locale, "/global-trade/how-it-works") },
    ]);
    expect(JSON.stringify(data)).not.toContain("HowTo");
  });

  it("publishes its metadata with canonical and language alternates", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale }) } as never);

    expect(metadata.description).toBe(copy.howItWorks.meta.description);
    expect(metadata.alternates?.canonical).toBe(localizedUrl(locale, "/global-trade/how-it-works"));
    expect(Object.keys(metadata.alternates?.languages ?? {})).toEqual(
      expect.arrayContaining(["en", "zh-CN", "ar", "x-default"]),
    );
  });
});

describe("/global-trade/how-it-works", () => {
  it("is a 404 for an unknown locale", async () => {
    await expect(
      HowItWorksPage({ params: Promise.resolve({ locale: "xx" }) } as never),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
