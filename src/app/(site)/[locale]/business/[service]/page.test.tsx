import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  intlServerMock,
  MESSAGES,
  renderServer,
  resetNavigation,
} from "@/components/business/test-utils";
import { SERVICE_SLUGS } from "@/content/services";
import { LOCALES } from "@/i18n/locales";
import { localizedUrl } from "@/lib/seo";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/business/test-utils")).navigationMock,
);
vi.mock(
  "next-intl/server",
  async () => (await import("@/components/business/test-utils")).intlServerMock,
);

import BusinessServicePage, { dynamicParams, generateMetadata, generateStaticParams } from "./page";

const props = (locale: string, service: string) =>
  ({ params: Promise.resolve({ locale, service }) }) as never;

beforeEach(() => {
  mocks.notFound.mockClear();
  intlServerMock.setRequestLocale.mockClear();
  resetNavigation("/business");
});

describe("/[locale]/business/[service] routing", () => {
  it("pre-renders every line in every language and answers 404 for anything else", () => {
    expect(dynamicParams).toBe(false);

    const params = generateStaticParams();
    expect(params).toHaveLength(LOCALES.length * SERVICE_SLUGS.length);
    for (const locale of LOCALES) {
      for (const service of SERVICE_SLUGS) expect(params).toContainEqual({ locale, service });
    }
  });

  it.each(["no-such-line", "Import-Export", "import-export/extra", ""])(
    "renders the 404 for the unknown slug %j",
    async (slug) => {
      await expect(BusinessServicePage(props("en", slug))).rejects.toThrow("NEXT_NOT_FOUND");
      expect(mocks.notFound).toHaveBeenCalledTimes(1);
    },
  );

  it("renders the 404 for an unknown locale, before doing anything for it", async () => {
    await expect(BusinessServicePage(props("xx", "import-export"))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(intlServerMock.setRequestLocale).not.toHaveBeenCalled();
  });

  it("also 404s the metadata of an unknown slug", async () => {
    await expect(generateMetadata(props("en", "no-such-line"))).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("/[locale]/business/[service] page", () => {
  it.each(SERVICE_SLUGS)("renders %s and fixes the request locale", async (slug) => {
    await renderServer(await BusinessServicePage(props("en", slug)), "en");

    expect(intlServerMock.setRequestLocale).toHaveBeenCalledWith("en");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      MESSAGES.en.services[slug].name,
    );
    // The layout owns <main>; the page must not add a second landmark.
    expect(document.querySelector("main")).toBeNull();
  });

  it.each(LOCALES)("renders in %s", async (locale) => {
    await renderServer(await BusinessServicePage(props(locale, "cross-border-trade")), locale);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      MESSAGES[locale].services["cross-border-trade"].name,
    );
  });
});

describe("/[locale]/business/[service] metadata", () => {
  it.each(SERVICE_SLUGS)("describes %s in its own words", async (slug) => {
    const metadata = await generateMetadata(props("en", slug));

    const copy = MESSAGES.en.business.pages[slug].meta;
    expect(metadata.title).toEqual({ absolute: `${copy.title} | Shaheen Sky` });
    expect(metadata.description).toBe(copy.description);
    expect(metadata.alternates?.canonical).toBe(localizedUrl("en", `/business/${slug}`));
  });

  it("points every language at the same line, with an x-default", async () => {
    const metadata = await generateMetadata(props("zh", "import-export"));

    expect(metadata.alternates?.canonical).toBe(localizedUrl("zh", "/business/import-export"));
    expect(metadata.alternates?.languages).toEqual({
      en: localizedUrl("en", "/business/import-export"),
      "zh-CN": localizedUrl("zh", "/business/import-export"),
      ar: localizedUrl("ar", "/business/import-export"),
      "x-default": localizedUrl("en", "/business/import-export"),
    });
    expect(metadata.title).toEqual({
      absolute: `${MESSAGES.zh.business.pages["import-export"].meta.title} | Shaheen Sky`,
    });
  });

  it("keeps titles and descriptions distinct across the six lines", async () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const slug of SERVICE_SLUGS) {
      const metadata = await generateMetadata(props("en", slug));
      titles.add(JSON.stringify(metadata.title));
      descriptions.add(String(metadata.description));
    }
    expect(titles.size).toBe(SERVICE_SLUGS.length);
    expect(descriptions.size).toBe(SERVICE_SLUGS.length);
  });
});
