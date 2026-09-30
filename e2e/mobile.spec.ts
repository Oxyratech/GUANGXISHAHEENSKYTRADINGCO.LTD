import { expect, test } from "@playwright/test";

/**
 * Mobile-specific behaviour: below the `xl` breakpoint the header replaces the full navigation
 * with MobileNav's drawer (see src/components/site/MobileNav.tsx). Runs on the "mobile" project
 * only (see playwright.config.ts); navigation.spec.ts covers the desktop header.
 */

test.describe("mobile navigation drawer", () => {
  test("opens, lists the full navigation, and a link both navigates and closes it", async ({
    page,
  }) => {
    await page.goto("/en");
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toHaveCount(0);

    await page.getByRole("button", { name: "Open menu" }).click();
    const drawerNav = page.getByRole("navigation", { name: "Main navigation" });
    await expect(drawerNav).toBeVisible();
    for (const name of [
      "Home",
      "About",
      "Business",
      "Products",
      "Global Trade",
      "Company",
      "Contact",
    ]) {
      await expect(drawerNav.getByRole("link", { name, exact: true })).toBeVisible();
    }

    await drawerNav.getByRole("link", { name: "About", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/about\/?$/);
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toHaveCount(0);
  });

  test("Escape closes the drawer and returns focus to the menu button", async ({ page }) => {
    await page.goto("/en");
    const trigger = page.getByRole("button", { name: "Open menu" });
    await trigger.click();
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("the Business row expands to show all six service links", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("button", { name: "Open menu" }).click();
    const drawerNav = page.getByRole("navigation", { name: "Main navigation" });

    const expandButton = drawerNav.getByRole("button", { name: "Business menu" });
    await expect(expandButton).toHaveAttribute("aria-expanded", "false");
    await expandButton.click();
    await expect(expandButton).toHaveAttribute("aria-expanded", "true");

    for (const name of [
      "International Trading",
      "Import & Export",
      "Product Sourcing",
      "Supplier Coordination",
      "Business Procurement",
      "Cross-Border Trade",
    ]) {
      await expect(drawerNav.getByRole("link", { name, exact: true })).toBeVisible();
    }
  });

  test("the drawer's Send inquiry action reaches the inquiry form", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("link", { name: "Send inquiry", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/inquiry\/?$/);
  });

  test("key pages have no horizontal overflow at a 360px viewport", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    for (const path of ["/en", "/en/company-information", "/en/inquiry", "/en/products"]) {
      await page.goto(path);
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth, `${path} overflows horizontally at 360px`).toBeLessThanOrEqual(
        clientWidth,
      );
    }
  });
});
