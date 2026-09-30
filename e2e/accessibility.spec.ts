import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Automated WCAG 2.1 A/AA scan (axe-core) of the key public pages in each locale, plus the admin
 * sign-in page. This catches missing labels, contrast failures, invalid ARIA and similar defects
 * that unit tests do not exercise. It is not a substitute for a manual screen-reader pass, but a
 * real regression gate.
 */

const PUBLIC_PAGES = [
  "/en",
  "/en/about",
  "/en/business",
  "/en/business/international-trading",
  "/en/products",
  "/en/products/hardware-products",
  "/en/global-trade",
  "/en/global-trade/how-it-works",
  "/en/company-information",
  "/en/news",
  "/en/faq",
  "/en/contact",
  "/en/inquiry",
  "/en/privacy-policy",
  "/zh",
  "/zh/company-information",
  "/ar",
  "/ar/company-information",
  "/ar/inquiry",
  "/ar/faq",
];

test.describe("accessibility (axe, WCAG 2.1 A/AA)", () => {
  for (const path of PUBLIC_PAGES) {
    test(`no violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(
        results.violations,
        results.violations
          .map(
            (v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.target).join(", ")}`,
          )
          .join("\n\n"),
      ).toEqual([]);
    });
  }

  test("no violations on the admin sign-in page", async ({ page }) => {
    await page.goto("/admin/login");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(
      results.violations,
      results.violations.map((v) => `${v.id} (${v.impact}): ${v.help}`).join("\n"),
    ).toEqual([]);
  });

  test("the FAQ accordion and inquiry form pass a scan after interaction, not just at rest", async ({
    page,
  }) => {
    await page.goto("/en/faq");
    // FAQ questions render as <h3><button>...</button></h3>; scope past the header's own
    // "expanded" menu buttons (Products, Business, the mobile menu trigger).
    await page.getByRole("heading", { level: 3 }).first().getByRole("button").click();
    let results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations).toEqual([]);

    await page.goto("/en/inquiry");
    await page.getByRole("button", { name: "Submit trade inquiry" }).click();
    results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations).toEqual([]);
  });
});
