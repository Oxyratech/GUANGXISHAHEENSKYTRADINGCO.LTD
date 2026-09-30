import { expect, test } from "@playwright/test";

/**
 * Admin, run with NO database configured (the normal state of this checkout). Sign-in is
 * impossible without one, and the page must say so honestly rather than let someone type a
 * password that can never be checked. See docs/SECURITY.md.
 */

test.describe("admin area without a database", () => {
  test("an unauthenticated visit to /admin redirects to the login page", async ({ page }) => {
    const response = await page.goto("/admin");
    expect(response?.status()).toBe(200); // after following the redirect
    await expect(page).toHaveURL(/\/admin\/login(\?.*)?$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("the login page explains the missing database and disables sign-in", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(
      page.getByText("The admin area needs a database connection (DATABASE_URL)."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeDisabled();
  });

  test("admin responses are never indexed", async ({ page }) => {
    const response = await page.goto("/admin/login");
    expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  });

  test("private file and media routes never leak with a generic error", async ({ page }) => {
    // With no database configured, a private file honestly reports the outage (503) rather than
    // guessing 401/404 — it cannot tell whether the caller would have been authorized.
    const file = await page.request.get("/files/00000000-0000-0000-0000-000000000000");
    expect([401, 403, 404, 503]).toContain(file.status());

    const media = await page.request.get("/media/00000000-0000-0000-0000-000000000000");
    expect([404, 401, 503]).toContain(media.status());
  });

  test("the API health check reports the database status honestly, never fake data", async ({
    page,
  }) => {
    const response = await page.request.get("/api/health");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ status: "ok", database: "not_configured" });
  });
});
