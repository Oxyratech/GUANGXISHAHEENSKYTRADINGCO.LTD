// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { NAMESPACES } from "@/i18n/namespaces";

const mocks = vi.hoisted(() => ({ loadMessages: vi.fn() }));
vi.mock("@/i18n/load-messages", () => ({ loadMessages: mocks.loadMessages }));

import { computeStaticContentCoverage } from "./static-content";

/** Every namespace present with the same trivial shape, so only the namespaces under test differ. */
function fixture(overrides: Record<string, unknown> = {}) {
  const base = Object.fromEntries(NAMESPACES.map((ns) => [ns, { key: "value" }]));
  return { ...base, common: { hello: "Hello" }, about: { title: "About" }, ...overrides };
}

describe("computeStaticContentCoverage", () => {
  it("is complete when every locale has the same non-empty keys", async () => {
    mocks.loadMessages.mockImplementation(() => Promise.resolve(fixture()));
    const result = await computeStaticContentCoverage();
    expect(result.complete).toBe(true);
    expect(result.namespaces.find((n) => n.namespace === "common")).toMatchObject({
      complete: true,
    });
  });

  it("flags a namespace missing a key in one locale", async () => {
    mocks.loadMessages.mockImplementation((locale: string) =>
      Promise.resolve(locale === "zh" ? fixture({ common: {} }) : fixture()),
    );
    const result = await computeStaticContentCoverage();
    expect(result.complete).toBe(false);
    const common = result.namespaces.find((n) => n.namespace === "common");
    expect(common?.complete).toBe(false);
    expect(common?.missingKeys.zh).toEqual(["hello"]);
    expect(common?.missingKeys.ar).toBeUndefined();
  });

  it("treats an empty string as missing, not merely present", async () => {
    mocks.loadMessages.mockImplementation((locale: string) =>
      Promise.resolve(locale === "ar" ? fixture({ about: { title: "" } }) : fixture()),
    );
    const result = await computeStaticContentCoverage();
    const about = result.namespaces.find((n) => n.namespace === "about");
    expect(about?.missingKeys.ar).toEqual(["title"]);
  });
});
