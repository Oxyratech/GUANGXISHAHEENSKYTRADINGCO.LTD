import { getTranslations } from "next-intl/server";
import type { NavLink, ServiceLink } from "@/config/navigation";
import type { Locale } from "@/i18n/locales";

/**
 * Turns the label references of the navigation model into words for one locale. Server-side: the
 * services and categories catalogues are read here so they never reach the client.
 */
export async function getLinkLabels(locale: Locale) {
  const [common, services, categories] = await Promise.all([
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "services" }),
    getTranslations({ locale, namespace: "categories" }),
  ]);

  return {
    common,
    label(link: NavLink): string {
      switch (link.kind) {
        case "page":
          return common(`nav.${link.labelKey}`);
        case "service":
          return services(`${link.slug}.name`);
        case "category":
          return categories(`${link.slug}.name`);
      }
    },
    summary(link: ServiceLink): string {
      return services(`${link.slug}.summary`);
    },
  };
}

export type LinkLabels = Awaited<ReturnType<typeof getLinkLabels>>;
