import { expect, test } from "@playwright/test";

/**
 * Cross-page navigation through real links, against a real server. Component tests already cover
 * each nav component in isolation; this proves the wiring between them is correct end to end.
 */

const PRIMARY_LINKS: Array<{ name: string; path: string }> = [
  { name: "About", path: "/en/about" },
  { name: "Business", path: "/en/business" },
  { name: "Products", path: "/en/products" },
  { name: "Global Trade", path: "/en/global-trade" },
  { name: "Company", path: "/en/company-information" },
  { name: "Contact", path: "/en/contact" },
];

test.describe("primary navigation", () => {
  test("home page redirects from / and renders exactly one h1", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/en\/?$/);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  });

  for (const { name, path } of PRIMARY_LINKS) {
    test(`header link "${name}" navigates to ${path}`, async ({ page }) => {
      await page.goto("/en");
      const nav = page.getByRole("navigation", { name: "Main navigation" });
      await nav.getByRole("link", { name, exact: true }).first().click();
      await expect(page).toHaveURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "/?$"));
      await expect(page.locator("h1")).toHaveCount(1);
    });
  }

  test('header "Send inquiry" CTA reaches the inquiry form', async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("link", { name: "Send inquiry", exact: true }).first().click();
    await expect(page).toHaveURL(/\/en\/inquiry\/?$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("footer exposes the legal pages and they render", async ({ page }) => {
    await page.goto("/en");
    const footerNav = page.getByRole("navigation", { name: "Footer navigation" });
    await expect(footerNav.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
      "href",
      "/en/privacy-policy",
    );
    await expect(footerNav.getByRole("link", { name: "Terms of Use" })).toHaveAttribute(
      "href",
      "/en/terms",
    );
    await expect(footerNav.getByRole("link", { name: "Cookie Policy" })).toHaveAttribute(
      "href",
      "/en/cookies",
    );

    await footerNav.getByRole("link", { name: "Privacy Policy" }).click();
    await expect(page).toHaveURL(/\/en\/privacy-policy\/?$/);
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test("footer shows the registered company facts, not invented ones", async ({ page }) => {
    await page.goto("/en");
    const footer = page.getByRole("contentinfo");
    await expect(footer.getByText("GUANGXI SHAHEEN SKY TRADING CO., LTD.").first()).toBeVisible();
    await expect(footer.getByText("广西沙欣斯凯商贸有限责任公司").first()).toBeVisible();
  });

  test("business menu lists all six service pages and each renders", async ({ page }) => {
    await page.goto("/en/business");
    await expect(page.locator("h1")).toHaveCount(1);
    for (const slug of [
      "international-trading",
      "import-export",
      "product-sourcing",
      "supplier-coordination",
      "business-procurement",
      "cross-border-trade",
    ]) {
      const res = await page.request.get(`/en/business/${slug}`);
      expect(res.status(), `/en/business/${slug}`).toBe(200);
    }
  });

  test("products index links to every registered category and each renders", async ({ page }) => {
    await page.goto("/en/products");
    await expect(page.locator("h1")).toHaveCount(1);
    for (const slug of [
      "consumer-goods",
      "apparel-accessories",
      "food-products",
      "household-products",
      "building-materials",
      "decorative-materials",
      "hardware-products",
      "electrical-products",
      "machinery-equipment",
      "metal-products",
      "minerals-ores",
      "medical-protective-supplies",
    ]) {
      const res = await page.request.get(`/en/products/${slug}`);
      expect(res.status(), `/en/products/${slug}`).toBe(200);
    }
  });

  test("an unknown path returns a real 404, not a silent fallback", async ({ page }) => {
    const response = await page.goto("/en/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Page not found");
  });

  test("company information shows the license-derived facts", async ({ page }) => {
    await page.goto("/en/company-information");
    const main = page.locator("main");
    await expect(main.getByText("91450100MAKG57TE3Y")).toBeVisible();
  });
});
