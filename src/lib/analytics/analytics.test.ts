import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPlausibleDomain, isAnalyticsActive, isTrackingBlocked } from "./config";
import { ANALYTICS_EVENTS, sanitizeProps } from "./events";
import { trackEvent } from "./track";

function setDoNotTrack(value: string | undefined) {
  Object.defineProperty(window.navigator, "doNotTrack", { value, configurable: true });
}

function setGlobalPrivacyControl(value: boolean | undefined) {
  Object.defineProperty(window.navigator, "globalPrivacyControl", { value, configurable: true });
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_PLAUSIBLE_DOMAIN", "");
  delete window.plausible;
});

afterEach(() => {
  vi.unstubAllEnvs();
  delete (window.navigator as { doNotTrack?: unknown }).doNotTrack;
  delete (window.navigator as { globalPrivacyControl?: unknown }).globalPrivacyControl;
  delete window.plausible;
});

describe("sanitizeProps", () => {
  it("keeps allow-listed keys with token-like primitive values", () => {
    expect(
      sanitizeProps({ locale: "zh", category: "food-products", product: "abc_1.2", count: 3 }),
    ).toEqual({ locale: "zh", category: "food-products", product: "abc_1.2" });
    expect(sanitizeProps({ source: true, from: 12 })).toEqual({ source: true, from: 12 });
  });

  it("drops keys outside the allow-list, whatever their value", () => {
    expect(
      sanitizeProps({ email: "buyer@example.com", name: "Wei", message: "hello", url: "/a" }),
    ).toEqual({});
  });

  it("drops values that could identify a person", () => {
    expect(
      sanitizeProps({
        source: "buyer@example.com",
        product: "call +8613800000000",
        category: "13800000000",
        document: "two words",
        to: "x".repeat(65),
      }),
    ).toEqual({});
  });

  it("drops non-primitive and non-finite values", () => {
    expect(
      sanitizeProps({ locale: { nested: "en" }, from: [1], to: Number.NaN, source: null }),
    ).toEqual({});
  });

  it("returns nothing for missing props", () => {
    expect(sanitizeProps(undefined)).toEqual({});
  });

  it("covers exactly the seven agreed events", () => {
    expect([...ANALYTICS_EVENTS]).toEqual([
      "page_view",
      "product_view",
      "inquiry_started",
      "inquiry_submitted",
      "contact_submitted",
      "language_changed",
      "document_viewed",
    ]);
  });
});

describe("configuration", () => {
  it("has no domain until one is set", () => {
    expect(getPlausibleDomain()).toBeUndefined();
    vi.stubEnv("NEXT_PUBLIC_PLAUSIBLE_DOMAIN", "  example.com ");
    expect(getPlausibleDomain()).toBe("example.com");
  });

  it("ignores a value that is not a hostname", () => {
    vi.stubEnv("NEXT_PUBLIC_PLAUSIBLE_DOMAIN", "https://example.com/path");
    expect(getPlausibleDomain()).toBeUndefined();
  });

  it("detects Do Not Track and Global Privacy Control", () => {
    expect(isTrackingBlocked()).toBe(false);
    setDoNotTrack("1");
    expect(isTrackingBlocked()).toBe(true);
    setDoNotTrack("yes");
    expect(isTrackingBlocked()).toBe(true);
    setDoNotTrack("0");
    expect(isTrackingBlocked()).toBe(false);
    setGlobalPrivacyControl(true);
    expect(isTrackingBlocked()).toBe(true);
  });

  it("is active only with a domain and without an opt-out", () => {
    expect(isAnalyticsActive()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_PLAUSIBLE_DOMAIN", "example.com");
    expect(isAnalyticsActive()).toBe(true);
    setDoNotTrack("1");
    expect(isAnalyticsActive()).toBe(false);
  });
});

describe("trackEvent", () => {
  it("does nothing when analytics are not configured", () => {
    trackEvent("product_view", { category: "food-products" });

    expect(window.plausible).toBeUndefined();
  });

  it("does nothing when the visitor has Do Not Track on", () => {
    vi.stubEnv("NEXT_PUBLIC_PLAUSIBLE_DOMAIN", "example.com");
    setDoNotTrack("1");
    const plausible = vi.fn();
    window.plausible = plausible;

    trackEvent("inquiry_started", { source: "header" });

    expect(plausible).not.toHaveBeenCalled();
  });

  it("sends the event and its allowed properties to Plausible", () => {
    vi.stubEnv("NEXT_PUBLIC_PLAUSIBLE_DOMAIN", "example.com");
    const plausible = vi.fn();
    window.plausible = plausible;

    trackEvent("language_changed", { from: "en", to: "ar" });

    expect(plausible).toHaveBeenCalledWith("language_changed", { props: { from: "en", to: "ar" } });
  });

  it("sends no properties object when there are none", () => {
    vi.stubEnv("NEXT_PUBLIC_PLAUSIBLE_DOMAIN", "example.com");
    const plausible = vi.fn();
    window.plausible = plausible;

    trackEvent("contact_submitted");

    expect(plausible).toHaveBeenCalledWith("contact_submitted", undefined);
  });

  it("strips anything that is not allowed before it leaves the browser", () => {
    vi.stubEnv("NEXT_PUBLIC_PLAUSIBLE_DOMAIN", "example.com");
    const plausible = vi.fn();
    window.plausible = plausible;

    trackEvent("inquiry_submitted", {
      source: "product",
      email: "buyer@example.com",
    } as never);

    expect(plausible).toHaveBeenCalledWith("inquiry_submitted", { props: { source: "product" } });
  });

  it("queues events until the Plausible script has loaded, then hands them over", () => {
    vi.stubEnv("NEXT_PUBLIC_PLAUSIBLE_DOMAIN", "example.com");

    trackEvent("document_viewed", { document: "business-license" });

    expect(window.plausible?.q).toEqual([
      ["document_viewed", { props: { document: "business-license" } }],
    ]);
  });
});
