import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end specs. These run against a real production server with NO database configured (see
 * .env.example): the point is partly to prove that database-backed pages and forms degrade
 * honestly — a 200 with a truthful empty/error state, never a fake success — which unit tests with
 * a mocked Prisma client cannot prove on their own.
 *
 * They run against `next build && next start`, not `next dev`: a cold dev-mode compile of the
 * first hit on each route can take longer than is reasonable to wait for in a test, and CI (which
 * these specs must also pass in) needs the deterministic, production-like server anyway.
 */
const PORT = 3200;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  // A single Next server handles every worker's requests, and this runs in a resource-constrained
  // sandbox: too much concurrency starves the server itself rather than testing anything real.
  workers: 4,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  timeout: 45_000,
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        // Uses the system-installed Chrome instead of Playwright's own downloaded browser: this
        // repo is developed in a sandbox where the Playwright CDN is unreachable. CI (which can
        // reach it) installs Playwright's pinned Chromium instead — see .github/workflows/ci.yml.
        channel: process.env.CI ? undefined : "chrome",
      },
      // mobile.spec.ts exercises MobileNav's drawer, whose trigger is hidden from `xl` up.
      testIgnore: /mobile\.spec\.ts$/,
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], channel: process.env.CI ? undefined : "chrome" },
      // navigation.spec.ts asserts the desktop header's always-visible nav; below the `xl` Tailwind
      // breakpoint it is replaced by MobileNav's drawer, covered instead by mobile.spec.ts.
      testIgnore: /navigation\.spec\.ts$/,
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npx next build && npx next start -p ${PORT}`,
        url: `${baseURL}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
        env: {
          // A production server refuses to start without one (see src/server/env.ts) — this is a
          // fixed test-only value, never a real secret. DATABASE_URL is deliberately left unset:
          // these specs prove the app degrades honestly when the database is unavailable.
          AUTH_SECRET: "e2e-test-only-not-a-real-secret-do-not-use-in-any-real-environment-01234",
        },
      },
});
