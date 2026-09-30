import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  BUSINESS_SCOPE_ITEMS,
  getFullScopeTextZh,
  SCOPE_GROUPS,
  SCOPE_SUFFIX_ZH,
} from "@/config/business-scope";
import arCompanyInfo from "@/messages/ar/companyInfo.json";
import arScope from "@/messages/ar/scope.json";
import enCompanyInfo from "@/messages/en/companyInfo.json";
import enScope from "@/messages/en/scope.json";
import zhCompanyInfo from "@/messages/zh/companyInfo.json";
import zhScope from "@/messages/zh/scope.json";
import { BusinessScopeDetail } from "./BusinessScopeDetail";
import { LOCALE_LIST, renderServer } from "./test-utils";

vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);
vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);

const SCOPE = { en: enScope, zh: zhScope, ar: arScope };
const INFO = { en: enCompanyInfo, zh: zhCompanyInfo, ar: arCompanyInfo };

describe.each(LOCALE_LIST)("BusinessScopeDetail (%s)", (locale) => {
  const scope = SCOPE[locale];
  const info = INFO[locale];
  const itemText = (id: string) => (scope.items as Record<string, string>)[id] ?? "";

  it("renders all 40 registered items, and only those", async () => {
    await renderServer(<BusinessScopeDetail locale={locale} />, locale);

    expect(BUSINESS_SCOPE_ITEMS).toHaveLength(40);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(40);
    for (const item of BUSINESS_SCOPE_ITEMS) {
      const expected = locale === "zh" ? item.zh : itemText(item.id);
      expect(
        items.some((entry) => entry.textContent?.includes(expected)),
        item.id,
      ).toBe(true);
    }
  });

  it("groups the items under the 13 scope groups, each list named by its heading", async () => {
    await renderServer(<BusinessScopeDetail locale={locale} />, locale);

    const headings = screen.getAllByRole("heading", { level: 3 });
    const groupNames = SCOPE_GROUPS.map(
      (group) => (scope.groups as Record<string, { name: string }>)[group]?.name ?? "",
    );
    expect(headings.slice(0, SCOPE_GROUPS.length).map((h) => h.textContent)).toEqual(groupNames);
    for (const name of groupNames) {
      expect(screen.getByRole("list", { name })).toBeInTheDocument();
    }
  });

  it("always shows the qualifier that applies to the whole scope", async () => {
    await renderServer(<BusinessScopeDetail locale={locale} />, locale);

    expect(screen.getByText(info.scope.qualifierTitle)).toBeInTheDocument();
    expect(screen.getAllByText(SCOPE_SUFFIX_ZH).length).toBeGreaterThan(0);
    if (locale !== "zh") expect(screen.getByText(scope.qualifier)).toBeInTheDocument();
  });

  it("always shows the translation note and the licensing note", async () => {
    await renderServer(<BusinessScopeDetail locale={locale} />, locale);

    expect(screen.getByText(scope.translationNote)).toBeInTheDocument();
    expect(screen.getByText(scope.regulatedNote)).toBeInTheDocument();
  });

  it("says that registered scope is not the same as published products, with two ways on", async () => {
    await renderServer(<BusinessScopeDetail locale={locale} />, locale);

    const callout = screen.getByRole("heading", { name: info.scope.notPublished.title });
    expect(callout.tagName).toBe("H3");
    const box = callout.parentElement?.parentElement as HTMLElement;
    const hrefs = within(box)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual([`/${locale}/products`, `/${locale}/inquiry`]);
  });

  it("keeps the license text available as printed", async () => {
    await renderServer(<BusinessScopeDetail locale={locale} />, locale);

    const summary = screen.getByText(info.scope.fullText.summary);
    expect(summary.closest("details")).toHaveTextContent(getFullScopeTextZh());
  });

  it("is a named region that the company page can link to", async () => {
    const { container } = await renderServer(<BusinessScopeDetail locale={locale} />, locale);

    const region = screen.getByRole("region", { name: scope.title });
    expect(region).toHaveAttribute("id", "business-scope");
    expect(container.querySelectorAll("h2")).toHaveLength(1);
  });
});

describe("BusinessScopeDetail wording", () => {
  it("shows the official Chinese under each item for English and Arabic readers", async () => {
    for (const locale of ["en", "ar"] as const) {
      const { container, unmount } = await renderServer(
        <BusinessScopeDetail locale={locale} />,
        locale,
      );
      const official = [...container.querySelectorAll("li [lang='zh-CN']")].map(
        (element) => element.textContent,
      );

      expect(official, locale).toEqual(
        SCOPE_GROUPS.flatMap((group) =>
          BUSINESS_SCOPE_ITEMS.filter((item) => item.group === group).map((item) => item.zh),
        ),
      );
      unmount();
    }
  });

  it("shows Chinese readers the license wording only, once per item", async () => {
    const { container } = await renderServer(<BusinessScopeDetail locale="zh" />, "zh");
    const items = [...container.querySelectorAll("li")];

    expect(items.map((item) => item.textContent)).toEqual(
      SCOPE_GROUPS.flatMap((group) =>
        BUSINESS_SCOPE_ITEMS.filter((item) => item.group === group).map((item) => item.zh),
      ),
    );
  });
});
