// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CATEGORY_SLUGS } from "@/content/categories";
import { SERVICE_SLUGS } from "@/content/services";
import {
  BUSINESS_MENU,
  FOOTER_COLUMNS,
  getNavActiveState,
  INQUIRY_LINK,
  PRIMARY_NAV,
  PRODUCTS_MENU,
  type NavLink,
} from "./navigation";
import { STATIC_PUBLIC_PATHS } from "./routes";

const staticPaths: readonly string[] = STATIC_PUBLIC_PATHS;
const categoryPaths = CATEGORY_SLUGS.map((slug) => `/products/${slug}`);

const allLinks: NavLink[] = [
  ...PRIMARY_NAV.map((item) => item.link),
  ...BUSINESS_MENU.links,
  BUSINESS_MENU.viewAll,
  ...PRODUCTS_MENU.links,
  PRODUCTS_MENU.viewAll,
  INQUIRY_LINK,
  ...FOOTER_COLUMNS.flatMap((column) => [...column.links]),
];

function readCommon(): { nav: Record<string, string> } {
  const file = fileURLToPath(new URL("../messages/en/common.json", import.meta.url));
  return JSON.parse(readFileSync(file, "utf8")) as { nav: Record<string, string> };
}

describe("navigation model", () => {
  it("links only to real routes", () => {
    const unknown = allLinks
      .map((link) => link.href)
      .filter((href) => !staticPaths.includes(href) && !categoryPaths.includes(href));
    expect(unknown).toEqual([]);
  });

  it("lists the primary items in the agreed order", () => {
    expect(PRIMARY_NAV.map((item) => item.id)).toEqual([
      "home",
      "about",
      "business",
      "products",
      "globalTrade",
      "company",
      "contact",
    ]);
  });

  it("opens the Business menu on Business and the Products menu on Products, nowhere else", () => {
    const withMenu = PRIMARY_NAV.filter((item) => item.menu).map((item) => [item.id, item.menu]);
    expect(withMenu).toEqual([
      ["business", "business"],
      ["products", "products"],
    ]);
  });

  it("derives the menus from the service and category registries", () => {
    expect(BUSINESS_MENU.links.map((link) => link.slug)).toEqual([...SERVICE_SLUGS]);
    expect(PRODUCTS_MENU.links.map((link) => link.slug)).toEqual([...CATEGORY_SLUGS]);
    expect(BUSINESS_MENU.links).toHaveLength(6);
    expect(PRODUCTS_MENU.links).toHaveLength(12);
    expect(BUSINESS_MENU.viewAll.href).toBe("/business");
    expect(PRODUCTS_MENU.viewAll.href).toBe("/products");
  });

  it("gives the footer the six services, the twelve categories and the three legal pages", () => {
    const column = (id: string) => FOOTER_COLUMNS.find((entry) => entry.id === id)?.links ?? [];
    expect(column("business")).toHaveLength(6);
    expect(column("products").filter((link) => link.kind === "category")).toHaveLength(12);
    expect(column("legal").map((link) => link.href)).toEqual([
      "/privacy-policy",
      "/terms",
      "/cookies",
    ]);
  });

  it("has an English label for every page link", () => {
    const { nav } = readCommon();
    const missing = allLinks.flatMap((link) =>
      link.kind === "page" && !nav[link.labelKey] ? [link.labelKey] : [],
    );
    expect(missing).toEqual([]);
  });
});

describe("getNavActiveState", () => {
  it("matches the page itself exactly", () => {
    expect(getNavActiveState("/about", "/about")).toBe("page");
    expect(getNavActiveState("/about/", "/about")).toBe("page");
    expect(getNavActiveState("/", "/")).toBe("page");
  });

  it("marks the parent section of a nested page", () => {
    expect(getNavActiveState("/business/import-export", "/business")).toBe("section");
    expect(getNavActiveState("/global-trade/how-it-works", "/global-trade")).toBe("section");
  });

  it("never treats the home page as an ancestor", () => {
    expect(getNavActiveState("/about", "/")).toBeNull();
  });

  it("does not confuse pages that share a prefix", () => {
    expect(getNavActiveState("/business-partners", "/business")).toBeNull();
    expect(getNavActiveState("/products", "/business")).toBeNull();
  });
});
