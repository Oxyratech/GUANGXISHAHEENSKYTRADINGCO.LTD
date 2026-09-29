import { CATEGORY_SLUGS, type CategorySlug } from "@/content/categories";
import { SERVICE_SLUGS, type ServiceSlug } from "@/content/services";
import type { Messages } from "@/i18n/messages";
import type { StaticPublicPath } from "./routes";

/**
 * Navigation model shared by the header, the mobile menu and the footer. It holds routes and label
 * *references* only; the words come from the `common` (pages), `services` and `categories`
 * namespaces, so the same model renders in every language.
 *
 * Every href is a real route: a static page from config/routes or a category page. Adding an entry
 * here for a page that does not exist fails navigation.test.ts.
 */

/** Keys of `common.nav`: the label of a static page. */
export type NavLabelKey = keyof Messages["common"]["nav"];

export interface PageLink {
  readonly kind: "page";
  readonly href: StaticPublicPath;
  readonly labelKey: NavLabelKey;
}

/** Name and summary come from `services.<slug>`. */
export interface ServiceLink {
  readonly kind: "service";
  readonly slug: ServiceSlug;
  readonly href: `/business/${ServiceSlug}`;
}

/** Name comes from `categories.<slug>`. */
export interface CategoryLink {
  readonly kind: "category";
  readonly slug: CategorySlug;
  readonly href: `/products/${CategorySlug}`;
}

export type NavLink = PageLink | ServiceLink | CategoryLink;

const page = (href: StaticPublicPath, labelKey: NavLabelKey): PageLink => ({
  kind: "page",
  href,
  labelKey,
});

const serviceLink = (slug: ServiceSlug): ServiceLink => ({
  kind: "service",
  slug,
  href: `/business/${slug}`,
});

const categoryLink = (slug: CategorySlug): CategoryLink => ({
  kind: "category",
  slug,
  href: `/products/${slug}`,
});

/** A dropdown under a primary item: its own links, then a link to the section's index page. */
export interface NavMenu<T extends ServiceLink | CategoryLink> {
  readonly links: readonly T[];
  readonly viewAll: PageLink;
}

export const BUSINESS_MENU: NavMenu<ServiceLink> = {
  links: SERVICE_SLUGS.map(serviceLink),
  viewAll: page("/business", "allBusiness"),
};

export const PRODUCTS_MENU: NavMenu<CategoryLink> = {
  links: CATEGORY_SLUGS.map(categoryLink),
  viewAll: page("/products", "allProducts"),
};

export type PrimaryNavId =
  "home" | "about" | "business" | "products" | "globalTrade" | "company" | "contact";

export interface PrimaryNavItem {
  readonly id: PrimaryNavId;
  readonly link: PageLink;
  /** Which dropdown opens under the item, if any. */
  readonly menu?: "business" | "products";
}

export const PRIMARY_NAV: readonly PrimaryNavItem[] = [
  { id: "home", link: page("/", "home") },
  { id: "about", link: page("/about", "about") },
  { id: "business", link: page("/business", "business"), menu: "business" },
  { id: "products", link: page("/products", "products"), menu: "products" },
  { id: "globalTrade", link: page("/global-trade", "globalTrade") },
  { id: "company", link: page("/company-information", "company") },
  { id: "contact", link: page("/contact", "contact") },
];

/** The call to action shown in the header, the mobile menu and the footer. */
export const INQUIRY_LINK: PageLink = page("/inquiry", "inquiry");

export type FooterColumnId = "navigation" | "business" | "products" | "company" | "legal";

export interface FooterColumn {
  readonly id: FooterColumnId;
  readonly links: readonly NavLink[];
}

export const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    id: "navigation",
    links: [
      page("/", "home"),
      page("/about", "about"),
      page("/business", "business"),
      page("/products", "products"),
      page("/global-trade", "globalTrade"),
      page("/global-trade/how-it-works", "tradeProcess"),
    ],
  },
  { id: "business", links: BUSINESS_MENU.links },
  { id: "products", links: [PRODUCTS_MENU.viewAll, ...PRODUCTS_MENU.links] },
  {
    id: "company",
    links: [
      page("/company-information", "companyInformation"),
      page("/news", "news"),
      page("/faq", "faq"),
      page("/contact", "contact"),
      INQUIRY_LINK,
    ],
  },
  {
    id: "legal",
    links: [
      page("/privacy-policy", "privacy"),
      page("/terms", "terms"),
      page("/cookies", "cookies"),
    ],
  },
];

export type NavActiveState = "page" | "section" | null;

function withoutTrailingSlash(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

/**
 * How a link relates to the current page. `pathname` has no locale prefix (usePathname from
 * @/i18n/navigation). "page" is the page itself; "section" is a page below it (/business/import-export
 * is inside /business). The home page is only ever "page".
 */
export function getNavActiveState(pathname: string, href: string): NavActiveState {
  const current = withoutTrailingSlash(pathname);
  if (current === href) return "page";
  if (href !== "/" && current.startsWith(`${href}/`)) return "section";
  return null;
}
