"use client";

import { useState } from "react";
import { ProductTranslationForm } from "@/components/admin/products/ProductTranslationForm";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LOCALES, LOCALE_META, type Locale } from "@/i18n/locales";
import type { ProductEditTranslation } from "@/server/admin/products/detail";

const FIELDS = [
  "name",
  "shortDescription",
  "description",
  "applications",
  "packagingInfo",
] as const;

function completeness(translation: ProductEditTranslation | undefined): number {
  if (!translation) return 0;
  return FIELDS.filter((field) => Boolean(translation[field]?.trim())).length;
}

function emptyValues(): {
  name: string;
  shortDescription: string;
  description: string;
  applications: string;
  packagingInfo: string;
} {
  return { name: "", shortDescription: "", description: "", applications: "", packagingInfo: "" };
}

/**
 * The Content tab's locale sub-tabs (English, 简体中文, العربية). Each tab's trigger shows how many of
 * the five fields that locale has filled in, so an editor can see translation coverage at a glance
 * without opening every tab.
 */
export function ProductLocaleEditor({
  productId,
  version,
  translations,
}: {
  productId: string;
  version: number;
  translations: readonly ProductEditTranslation[];
}) {
  const [active, setActive] = useState<Locale>("en");
  const byLocale = new Map(translations.map((t) => [t.locale, t]));

  return (
    <Tabs value={active} onValueChange={(value) => setActive(value as Locale)}>
      <TabsList aria-label="Content language">
        {LOCALES.map((locale) => {
          const done = completeness(byLocale.get(locale));
          return (
            <TabsTrigger key={locale} value={locale} className="gap-2">
              {LOCALE_META[locale].nativeName}
              <Badge variant={done === FIELDS.length ? "success" : done > 0 ? "gold" : "neutral"}>
                {done}/{FIELDS.length}
              </Badge>
            </TabsTrigger>
          );
        })}
      </TabsList>
      {LOCALES.map((locale) => {
        const translation = byLocale.get(locale);
        const values = translation
          ? {
              name: translation.name,
              shortDescription: translation.shortDescription ?? "",
              description: translation.description ?? "",
              applications: translation.applications ?? "",
              packagingInfo: translation.packagingInfo ?? "",
            }
          : emptyValues();
        return (
          <TabsContent key={locale} value={locale}>
            <ProductTranslationForm
              id={productId}
              version={version}
              locale={locale}
              values={values}
            />
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
