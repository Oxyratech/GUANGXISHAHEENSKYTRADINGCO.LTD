import { expect, test } from "@playwright/test";

/**
 * Locale switching and RTL correctness. Component tests already cover LanguageSwitcher in
 * isolation; this proves real navigation, real translated content, and real `dir="rtl"` layout.
 */

test.describe("locale switching", () => {
  test("each locale renders its own translated <h1> with the right lang/dir", async ({ page }) => {
    const seen = new Set<string>();
    for (const [locale, lang, dir] of [
      ["en", "en", "ltr"],
      ["zh", "zh-CN", "ltr"],
      ["ar", "ar", "rtl"],
    ] as const) {
      await page.goto(`/${locale}/about`);
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
      await expect(page.locator("html")).toHaveAttribute("dir", dir);
      const h1 = page.locator("h1");
      await expect(h1).toHaveCount(1);
      const text = (await h1.textContent())?.trim() ?? "";
      expect(text.length).toBeGreaterThan(0);
      // Real, distinct translations for each locale, not the same English string reused.
      expect(seen.has(text)).toBe(false);
      seen.add(text);
    }
  });

  test("the language switcher moves to the same page in the chosen language", async ({ page }) => {
    await page.goto("/en/about");
    await page.getByRole("button", { name: /Language: English\. Change language\./ }).click();
    await page.getByRole("menuitem", { name: "简体中文" }).click();

    await expect(page).toHaveURL(/\/zh\/about\/?$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");

    // Switch again, Chinese -> Arabic, staying on the same page.
    await page.getByRole("button", { name: /语言|Language/ }).click();
    await page.getByRole("menuitem", { name: "العربية" }).click();
    await expect(page).toHaveURL(/\/ar\/about\/?$/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  test("hreflang alternates cover en, zh-CN, ar and x-default on every locale", async ({
    page,
  }) => {
    for (const locale of ["en", "zh", "ar"]) {
      await page.goto(`/${locale}/faq`);
      const hreflangs = await page
        .locator('link[rel="alternate"][hreflang]')
        .evaluateAll((links) => links.map((l) => l.getAttribute("hreflang")));
      for (const expected of ["en", "zh-CN", "ar", "x-default"]) {
        expect(hreflangs, `hreflang alternates on /${locale}/faq`).toContain(expected);
      }
    }
  });
});

test.describe("Arabic RTL correctness", () => {
  test("navigation, language menu and the FAQ accordion work under dir=rtl", async ({ page }) => {
    await page.goto("/ar/faq");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("h1")).toHaveCount(1);

    // A real interactive Radix disclosure still works when the page is RTL. FAQ questions render
    // as <h3><button>...</button></h3>, so scope to a level-3 heading to avoid the header's own
    // "expanded" menu buttons (Products, Business, the mobile menu).
    const trigger = page.getByRole("heading", { level: 3 }).first().getByRole("button");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    // Main navigation is present and usable, translated, in Arabic. Below `xl` it lives inside
    // MobileNav's drawer (mobile.spec.ts covers that drawer's own behaviour in English), so open it
    // first when that is the layout in play; above `xl` it is already on screen.
    const navName = /التنقل الرئيسي|Main navigation/;
    const menuButton = page.getByRole("button", { name: /فتح القائمة|Open menu/ });
    if (await menuButton.isVisible()) await menuButton.click();
    await expect(page.getByRole("navigation", { name: navName }).first()).toBeVisible();
  });

  test("no page ships a physical-direction Tailwind class (RTL must be logical-property driven)", async ({
    page,
  }) => {
    await page.goto("/ar");
    const offenders = await page.evaluate(() => {
      const pattern =
        /(^|\s)(ml|mr|pl|pr|left|right|text-left|text-right|rounded-l|rounded-r|border-l|border-r)-/;
      const hits: string[] = [];
      for (const el of Array.from(document.querySelectorAll("[class]"))) {
        const className = el.getAttribute("class") ?? "";
        if (pattern.test(className)) hits.push(className);
      }
      return hits;
    });
    expect(offenders).toEqual([]);
  });

  test("the license and USCC stay Latin/left-to-right inside the Arabic page", async ({ page }) => {
    await page.goto("/ar/company-information");
    // The footer repeats the USCC site-wide, so scope to the page's own registration section.
    const uscc = page.locator("main").getByText("91450100MAKG57TE3Y");
    await expect(uscc).toBeVisible();
    await expect(uscc).toHaveCSS("direction", "ltr");
  });
});
