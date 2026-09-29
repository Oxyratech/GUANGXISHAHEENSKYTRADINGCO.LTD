import { Icon } from "@/components/icons";
import {
  BUSINESS_MENU,
  INQUIRY_LINK,
  PRIMARY_NAV,
  PRODUCTS_MENU,
  type PageLink,
} from "@/config/navigation";
import { getCategory } from "@/content/categories";
import { getService } from "@/content/services";
import type { Locale } from "@/i18n/locales";
import { getLinkLabels, type LinkLabels } from "./link-labels";
import type {
  NavItemModel,
  NavLinkModel,
  NavMenuLinkModel,
  NavMenuModel,
  SiteNavModel,
} from "./nav-types";

function pageModel(link: PageLink, labels: LinkLabels): NavLinkModel {
  return { href: link.href, label: labels.label(link) };
}

function businessMenu(labels: LinkLabels): NavMenuModel {
  return {
    links: BUSINESS_MENU.links.map((link): NavMenuLinkModel => {
      const service = getService(link.slug);
      return {
        href: link.href,
        label: labels.label(link),
        description: labels.summary(link),
        icon: service ? <Icon name={service.icon} /> : undefined,
      };
    }),
    viewAll: pageModel(BUSINESS_MENU.viewAll, labels),
  };
}

function productsMenu(labels: LinkLabels): NavMenuModel {
  return {
    links: PRODUCTS_MENU.links.map((link): NavMenuLinkModel => {
      const category = getCategory(link.slug);
      return {
        href: link.href,
        label: labels.label(link),
        icon: category ? <Icon name={category.icon} /> : undefined,
      };
    }),
    viewAll: pageModel(PRODUCTS_MENU.viewAll, labels),
  };
}

const MENUS: Record<"business" | "products", (labels: LinkLabels) => NavMenuModel> = {
  business: businessMenu,
  products: productsMenu,
};

/** The header and mobile menu content for one locale. */
export async function buildSiteNavModel(locale: Locale): Promise<SiteNavModel> {
  const labels = await getLinkLabels(locale);
  const items: NavItemModel[] = PRIMARY_NAV.map((item) => ({
    id: item.id,
    ...pageModel(item.link, labels),
    ...(item.menu ? { menu: MENUS[item.menu](labels) } : {}),
  }));
  return { items, inquiry: pageModel(INQUIRY_LINK, labels) };
}
