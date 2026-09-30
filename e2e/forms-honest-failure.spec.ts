import { expect, test } from "@playwright/test";

/**
 * These specs run with NO database configured (see .env.example / playwright.config.ts), which is
 * the normal state of this repository checkout. That is deliberate: it proves the brief's "no fake
 * success" rule holds for real, submitted forms — not only in a unit test with a mocked Prisma
 * client. A submission must fail with a clear, honest message and never show a fake confirmation.
 *
 * The anti-spam "submitted too fast" guard has a minimum fill time, so each test waits briefly
 * before submitting — that wait is asserting real behaviour, not test laziness.
 */

const DB_UNAVAILABLE_MESSAGE =
  "We could not save your submission because our systems could not be reached just now. Please try again in a little while.";

/**
 * `getByLabel(..., { exact: true })` matches a `<label>` element's raw text content, which here
 * includes the visually decorative "*" required-marker (it is `aria-hidden`, so it is correctly
 * excluded from the *accessible name*, but not from `getByLabel`'s own text extraction). Locating
 * by role/accessible-name instead sidesteps that mismatch and is what these fields resolve to.
 */

test.describe("public forms fail honestly without a database", () => {
  test("the business inquiry form never shows a fake success", async ({ page }) => {
    await page.goto("/en/inquiry");
    await expect(page.locator("h1")).toHaveCount(1);

    await page.getByRole("textbox", { name: "Your name", exact: true }).fill("Jordan Buyer");
    await page.getByRole("textbox", { name: "Company", exact: true }).fill("Test Buyer Co.");
    await page.getByRole("combobox", { name: "Country", exact: true }).selectOption({ index: 1 });
    await page.getByRole("textbox", { name: "Email", exact: true }).fill("buyer@example.com");
    await page
      .getByRole("textbox", { name: "Product", exact: true })
      .fill("Stainless steel hardware fittings");
    await page.getByRole("checkbox").check();

    await page.waitForTimeout(3500);
    await page.getByRole("button", { name: "Submit trade inquiry" }).click();

    await expect(page.getByText(DB_UNAVAILABLE_MESSAGE)).toBeVisible({ timeout: 10_000 });
    // No fake confirmation / reference code must ever appear.
    await expect(page.getByText(/^INQ-/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Submit trade inquiry" })).toBeVisible();
  });

  test("the contact form never shows a fake success", async ({ page }) => {
    await page.goto("/en/contact");
    await expect(page.locator("h1")).toHaveCount(1);

    const form = page.locator("form", { has: page.getByRole("button", { name: "Send message" }) });
    await form.getByRole("textbox", { name: "Your name", exact: true }).fill("Jordan Buyer");
    await form.getByRole("textbox", { name: "Email", exact: true }).fill("buyer@example.com");
    await form
      .getByRole("textbox", { name: "Message", exact: true })
      .fill("Please share your product range.");
    await form.getByRole("checkbox").check();

    await page.waitForTimeout(3500);
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(page.getByText(DB_UNAVAILABLE_MESSAGE)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/^MSG-/)).toHaveCount(0);
  });

  test("the inquiry form rejects an obviously invalid submission before ever reaching the server", async ({
    page,
  }) => {
    await page.goto("/en/inquiry");
    const email = page.getByRole("textbox", { name: "Email", exact: true });
    await email.fill("not-an-email");
    await email.blur();
    await page.waitForTimeout(3500);
    await page.getByRole("button", { name: "Submit trade inquiry" }).click();

    // Validation errors, not the database-unavailable message: the request never left the browser.
    await expect(page.getByText(DB_UNAVAILABLE_MESSAGE)).toHaveCount(0);
    await expect(page.getByText("Please check these fields")).toBeVisible();
  });
});
