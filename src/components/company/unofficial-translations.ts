import type { Locale } from "@/i18n/locales";

/** Registration entries printed in Chinese only on the license. */
export type TranslatedEntry = "companyType" | "address" | "authority";

/**
 * Renderings of those entries for readers of English and Arabic, shown beside the Chinese original
 * and always labelled as unofficial. They live next to the registration data rather than in the
 * message catalogues because they translate legal facts, not page copy, and Chinese readers need
 * none. Change them together with src/config/company.ts.
 */
const TRANSLATIONS = {
  en: {
    companyType: "Limited liability company (wholly owned by a foreign natural person)",
    address:
      "Room 603, Unit 1, Building 4, No. 6 Guiya Road, Qingxiu District, Nanning, Guangxi, China",
    authority: "Nanning Municipal Administration for Market Regulation",
  },
  ar: {
    companyType: "شركة ذات مسؤولية محدودة (مملوكة بالكامل لشخص طبيعي أجنبي)",
    address: "غرفة 603، الوحدة 1، المبنى 4، رقم 6 طريق قوييا، حي تشينغشيو، نانينغ، قوانغشي، الصين",
    authority: "إدارة الرقابة على السوق في مدينة نانينغ",
  },
} as const satisfies Record<Exclude<Locale, "zh">, Record<TranslatedEntry, string>>;

/** The unofficial renderings for a locale, or null where the Chinese original needs none (zh). */
export function getUnofficialTranslations(locale: Locale): Record<TranslatedEntry, string> | null {
  return locale === "zh" ? null : TRANSLATIONS[locale];
}
