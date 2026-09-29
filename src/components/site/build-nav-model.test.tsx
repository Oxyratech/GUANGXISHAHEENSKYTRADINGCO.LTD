import { describe, expect, it, vi } from "vitest";
import { CATEGORY_SLUGS } from "@/content/categories";
import { SERVICE_SLUGS } from "@/content/services";
import { LOCALES } from "@/i18n/locales";
import { buildSiteNavModel } from "./build-nav-model";

vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);

describe("buildSiteNavModel", () => {
  it.each(LOCALES)("translates every label and summary for %s", async (locale) => {
    const model = await buildSiteNavModel(locale);
    const labels = [
      model.inquiry.label,
      ...model.items.flatMap((item) => [
        item.label,
        ...(item.menu
          ? [
              item.menu.viewAll.label,
              ...item.menu.links.flatMap((link) => [link.label, link.description ?? "x"]),
            ]
          : []),
      ]),
    ];
    // A missing message comes back as its own key path ("nav.home", "international-trading.name").
    expect(
      labels.filter((label) => label.trim() === "" || /^[\w-]+(\.[\w-]+)+$/.test(label)),
    ).toEqual([]);
  });

  it("gives Business its six business lines with summaries and Products its twelve categories", async () => {
    const model = await buildSiteNavModel("en");
    const business = model.items.find((item) => item.id === "business")?.menu;
    const products = model.items.find((item) => item.id === "products")?.menu;

    expect(business?.links.map((link) => link.href)).toEqual(
      SERVICE_SLUGS.map((slug) => `/business/${slug}`),
    );
    expect(business?.links.every((link) => link.description && link.icon)).toBe(true);
    expect(business?.viewAll).toEqual({ href: "/business", label: "All business lines" });
    expect(products?.links.map((link) => link.href)).toEqual(
      CATEGORY_SLUGS.map((slug) => `/products/${slug}`),
    );
    expect(products?.links.every((link) => link.description === undefined && link.icon)).toBe(true);
    expect(products?.viewAll).toEqual({ href: "/products", label: "All products" });
  });

  it("gives only Business and Products a menu", async () => {
    const model = await buildSiteNavModel("zh");

    expect(model.items.filter((item) => item.menu).map((item) => item.id)).toEqual([
      "business",
      "products",
    ]);
    expect(model.inquiry).toEqual({ href: "/inquiry", label: "发送询盘" });
  });
});
