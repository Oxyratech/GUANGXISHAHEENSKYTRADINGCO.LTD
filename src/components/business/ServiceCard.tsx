import { getLocale, getTranslations } from "next-intl/server";
import { DirectionalIcon, Icon } from "@/components/icons";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardLink,
  CardTitle,
} from "@/components/ui/card";
import type { ServiceSlug } from "@/content/services";
import type { Locale } from "@/i18n/locales";
import { cn } from "@/lib/utils";
import { serviceDefinition } from "./service-config";

export interface ServiceCardProps {
  slug: ServiceSlug;
  /** Level of the card's heading, so it fits under the section heading that holds the grid. */
  headingLevel?: 2 | 3;
  /** Icon beside the name and a two-line summary, without the "learn more" row. */
  compact?: boolean;
  /**
   * The page's locale. Passing it keeps the caller statically renderable without a lookup; when it
   * is left out the request locale is used, which needs setRequestLocale() to have been called.
   */
  locale?: Locale;
}

/**
 * One business line as a card that links to /business/<slug>. The whole card is the click target
 * (see ui/card), but assistive technology finds a single link named after the line.
 */
export async function ServiceCard({
  slug,
  headingLevel = 3,
  compact = false,
  locale,
}: ServiceCardProps) {
  const resolvedLocale = locale ?? (await getLocale());
  const [services, common] = await Promise.all([
    getTranslations({ locale: resolvedLocale, namespace: "services" }),
    getTranslations({ locale: resolvedLocale, namespace: "common" }),
  ]);
  const { icon } = serviceDefinition(slug);

  const heading = (
    <CardTitle
      as={headingLevel === 2 ? "h2" : "h3"}
      className={cn(compact && "text-body-lg font-semibold")}
    >
      <CardLink href={`/business/${slug}`}>{services(`${slug}.name`)}</CardLink>
    </CardTitle>
  );

  const iconTile = (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700",
        compact ? "size-10" : "size-12",
      )}
    >
      <Icon name={icon} size={compact ? 20 : 24} />
    </span>
  );

  if (compact) {
    return (
      <Card as="article" interactive className="h-full w-full">
        <CardHeader className="flex-row items-start gap-4 p-5">
          {iconTile}
          <div className="grid min-w-0 gap-1">
            {heading}
            <CardDescription className="line-clamp-2">
              {services(`${slug}.summary`)}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card as="article" interactive className="h-full w-full">
      <CardHeader className="gap-5">
        {iconTile}
        <div className="grid gap-2">
          {heading}
          <CardDescription>{services(`${slug}.summary`)}</CardDescription>
        </div>
      </CardHeader>
      <CardFooter className="mt-auto border-t-0 px-6 pt-0 pb-6">
        <span aria-hidden className="inline-flex items-center gap-2 text-label text-blue-700">
          {common("cta.learnMore")}
          <DirectionalIcon size={16} />
        </span>
      </CardFooter>
    </Card>
  );
}
