import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/locales";
import { COUNTRY_CODES, getCountryName, getCountryOptions, isCountryCode } from "./countries";

describe("COUNTRY_CODES", () => {
  it("holds the 249 assigned ISO 3166-1 alpha-2 codes, each once", () => {
    expect(COUNTRY_CODES).toHaveLength(249);
    expect(new Set(COUNTRY_CODES).size).toBe(249);
    for (const code of COUNTRY_CODES) expect(code).toMatch(/^[A-Z]{2}$/);
  });

  it("includes the countries buyers most plausibly come from", () => {
    for (const code of ["CN", "US", "GB", "DE", "AE", "SA", "EG", "IN", "BR", "NG", "TW", "HK"]) {
      expect(COUNTRY_CODES).toContain(code);
    }
  });
});

describe("isCountryCode", () => {
  it("accepts assigned codes and rejects everything else", () => {
    expect(isCountryCode("CN")).toBe(true);
    expect(isCountryCode("cn")).toBe(false);
    expect(isCountryCode("China")).toBe(false);
    expect(isCountryCode("XX")).toBe(false);
    expect(isCountryCode("")).toBe(false);
    expect(isCountryCode(null)).toBe(false);
    expect(isCountryCode(156)).toBe(false);
  });
});

describe("getCountryName", () => {
  it.each([
    ["en", "China"],
    ["zh", "中国"],
    ["ar", "الصين"],
  ] as const)("names China in %s", (locale, name) => {
    expect(getCountryName("CN", locale)).toBe(name);
  });

  it.each(LOCALES)("has a real name, not the bare code, for every country in %s", (locale) => {
    const unnamed = COUNTRY_CODES.filter((code) => getCountryName(code, locale) === code);
    expect(unnamed).toEqual([]);
  });
});

describe("getCountryOptions", () => {
  it.each(LOCALES)("lists every country once, with its code, in %s", (locale) => {
    const options = getCountryOptions(locale);
    expect(options).toHaveLength(COUNTRY_CODES.length);
    expect(new Set(options.map((option) => option.code)).size).toBe(COUNTRY_CODES.length);
  });

  it("sorts by the collation of the language", () => {
    const en = getCountryOptions("en").map((option) => option.name);
    expect(en.slice(0, 3)).toEqual(["Afghanistan", "Åland Islands", "Albania"]);
    expect(en).toEqual([...en].sort((a, b) => a.localeCompare(b, "en")));

    const ar = getCountryOptions("ar").map((option) => option.name);
    expect(ar).toEqual([...ar].sort((a, b) => a.localeCompare(b, "ar")));
  });

  it("orders Chinese names by pinyin, as a Chinese reader expects", () => {
    const names = getCountryOptions("zh").map((option) => option.name);
    expect(names.indexOf("阿富汗")).toBeLessThan(names.indexOf("美国"));
    expect(names.indexOf("美国")).toBeLessThan(names.indexOf("中国"));
  });
});
