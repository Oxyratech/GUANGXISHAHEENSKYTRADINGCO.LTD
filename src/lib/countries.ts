import { LOCALE_META, type Locale } from "@/i18n/locales";

/**
 * The 249 officially assigned ISO 3166-1 alpha-2 codes. Forms store the code (never a translated
 * name) and every language shows the name CLDR gives it, through Intl.DisplayNames.
 */
// prettier-ignore
export const COUNTRY_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU",
  "AW", "AX", "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL",
  "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY", "BZ", "CA", "CC",
  "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV",
  "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG",
  "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD",
  "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT",
  "GU", "GW", "GY", "HK", "HM", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM",
  "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG", "KH",
  "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK",
  "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH",
  "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW",
  "MX", "MY", "MZ", "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR",
  "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR",
  "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW", "SA", "SB", "SC",
  "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS",
  "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL",
  "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY",
  "UZ", "VA", "VC", "VE", "VG", "VI", "VN", "VU", "WF", "WS", "YE", "YT", "ZA",
  "ZM", "ZW",
] as const;

export type CountryCode = (typeof COUNTRY_CODES)[number];

const CODE_SET: ReadonlySet<string> = new Set(COUNTRY_CODES);

export function isCountryCode(value: unknown): value is CountryCode {
  return typeof value === "string" && CODE_SET.has(value);
}

const displayNames = new Map<Locale, Intl.DisplayNames>();
const collators = new Map<Locale, Intl.Collator>();

function displayNamesFor(locale: Locale): Intl.DisplayNames {
  let names = displayNames.get(locale);
  if (!names) {
    names = new Intl.DisplayNames([LOCALE_META[locale].htmlLang], { type: "region" });
    displayNames.set(locale, names);
  }
  return names;
}

/** The name of a country in `locale`; the code itself when the runtime has no name for it. */
export function getCountryName(code: CountryCode, locale: Locale): string {
  return displayNamesFor(locale).of(code) ?? code;
}

export interface CountryOption {
  code: CountryCode;
  name: string;
}

/** Every country with its name in `locale`, sorted by that language's own collation rules. */
export function getCountryOptions(locale: Locale): CountryOption[] {
  let collator = collators.get(locale);
  if (!collator) {
    collator = new Intl.Collator(LOCALE_META[locale].htmlLang);
    collators.set(locale, collator);
  }
  const collate = collator;
  return COUNTRY_CODES.map((code) => ({ code, name: getCountryName(code, locale) })).sort((a, b) =>
    collate.compare(a.name, b.name),
  );
}
