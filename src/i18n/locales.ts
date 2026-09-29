/** Supported public locales. Admin UI is English-only and is not localised. */
export const LOCALES = ["en", "zh", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export type Direction = "ltr" | "rtl";

export interface LocaleMeta {
  /** Name of the language in that language — used by the language switcher. */
  readonly nativeName: string;
  readonly dir: Direction;
  /** Value for <html lang>. */
  readonly htmlLang: string;
  /** Value for hreflang alternates. */
  readonly hreflang: string;
  /** Open Graph locale. */
  readonly ogLocale: string;
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: { nativeName: "English", dir: "ltr", htmlLang: "en", hreflang: "en", ogLocale: "en_US" },
  zh: { nativeName: "简体中文", dir: "ltr", htmlLang: "zh-CN", hreflang: "zh-CN", ogLocale: "zh_CN" },
  ar: { nativeName: "العربية", dir: "rtl", htmlLang: "ar", hreflang: "ar", ogLocale: "ar_AR" },
};

export function isLocale(value: string | undefined | null): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function getDirection(locale: Locale): Direction {
  return LOCALE_META[locale].dir;
}
