import { LOCALES } from "@/i18n/locales";
import { getUnofficialTranslations } from "./unofficial-translations";

describe("getUnofficialTranslations", () => {
  it("gives Chinese readers nothing: the original is the text", () => {
    expect(getUnofficialTranslations("zh")).toBeNull();
  });

  it.each(LOCALES.filter((locale) => locale !== "zh"))(
    "renders company type, address and authority for %s",
    (locale) => {
      const entries = getUnofficialTranslations(locale);
      expect(entries).not.toBeNull();
      expect(Object.keys(entries ?? {}).sort()).toEqual(["address", "authority", "companyType"]);
      for (const text of Object.values(entries ?? {})) expect(text.trim()).not.toBe("");
    },
  );

  it("keeps the unit, building and room of the registered address in English", () => {
    const address = getUnofficialTranslations("en")?.address ?? "";
    for (const part of ["603", "Unit 1", "Building 4", "No. 6", "Qingxiu", "Nanning"]) {
      expect(address).toContain(part);
    }
  });

  it("is written in Arabic for Arabic readers", () => {
    const entries = getUnofficialTranslations("ar");
    for (const text of Object.values(entries ?? {})) expect(text).toMatch(/\p{Script=Arabic}/u);
  });
});
