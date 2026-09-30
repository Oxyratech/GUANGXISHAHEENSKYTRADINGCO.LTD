// @vitest-environment node
import { describe, expect, it } from "vitest";
import { computeStaticContentCoverage } from "./static-content";

/**
 * Against the real message catalogue (no mocks): src/i18n/messages.test.ts already enforces that
 * en/zh/ar share the same key tree, so this must always be complete. If it were ever not, the report
 * page must say so honestly rather than claim completeness — this test is the same guarantee, from
 * the report's own computation.
 */
describe("computeStaticContentCoverage against the real catalogue", () => {
  it("is complete", async () => {
    const result = await computeStaticContentCoverage();
    expect(result.complete).toBe(true);
    expect(result.namespaces.length).toBeGreaterThan(0);
  });
});
