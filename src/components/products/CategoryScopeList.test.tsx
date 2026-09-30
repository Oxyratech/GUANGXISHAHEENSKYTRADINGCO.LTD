import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getCategoryScopeItems } from "@/content/categories";
import { CATEGORY_SLUGS } from "@/content/categories";
import { LOCALES } from "@/i18n/locales";
import enScope from "@/messages/en/scope.json";
import zhScope from "@/messages/zh/scope.json";
import { CategoryScopeList } from "./CategoryScopeList";
import { renderServer } from "./test-utils";

vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);

describe("CategoryScopeList", () => {
  it("lists the registered scope items of the category with their license text and the qualifier", async () => {
    await renderServer(<CategoryScopeList slug="consumer-goods" locale="en" />);

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(getCategoryScopeItems("consumer-goods").length);
    expect(screen.getByText("Sales of toys")).toBeInTheDocument();
    // The Chinese license text is shown verbatim, marked as Chinese.
    const official = screen.getAllByText("玩具销售")[0];
    expect(official).toHaveAttribute("lang", "zh-CN");
    expect(screen.getByText(enScope.qualifier)).toBeInTheDocument();
    expect(screen.getByText(enScope.translationNote)).toBeInTheDocument();
  });

  it("does not list scope items of other categories", async () => {
    await renderServer(<CategoryScopeList slug="food-products" locale="en" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("Import and export of food")).toBeInTheDocument();
    expect(screen.queryByText("Sales of toys")).not.toBeInTheDocument();
  });

  it("shows the license text itself in Chinese, without a duplicate line or a translation note", async () => {
    await renderServer(<CategoryScopeList slug="consumer-goods" locale="zh" />);

    expect(screen.getByText("玩具销售")).toBeInTheDocument();
    expect(screen.getAllByText("玩具销售")).toHaveLength(1);
    expect(screen.getByText(zhScope.qualifier)).toBeInTheDocument();
    expect(screen.queryByText(zhScope.translationNote)).not.toBeInTheDocument();
  });

  it("isolates the Chinese license text in right-to-left pages", async () => {
    await renderServer(<CategoryScopeList slug="consumer-goods" locale="ar" />);
    const official = screen.getAllByText("玩具销售")[0];
    expect(official).toHaveAttribute("dir", "ltr");
    expect(official).toHaveAttribute("lang", "zh-CN");
  });

  it.each(LOCALES)(
    "has a translation for every scope item of every category in %s",
    async (locale) => {
      for (const slug of CATEGORY_SLUGS) {
        const { unmount } = await renderServer(<CategoryScopeList slug={slug} locale={locale} />);
        expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
        unmount();
      }
    },
  );
});
