import { describe, expect, it } from "vitest";
import { buildInquiryMailto, buildTelHref, buildWhatsAppHref } from "./contact-links";

describe("buildInquiryMailto", () => {
  it("URL-encodes the address and the reference code in the subject", () => {
    expect(buildInquiryMailto("jane@example.com", "INQ-7K3Q9M2X")).toBe(
      "mailto:jane%40example.com?subject=Your%20inquiry%20INQ-7K3Q9M2X",
    );
  });
});

describe("buildTelHref", () => {
  it("builds a tel: link from digits only, with a leading +", () => {
    expect(buildTelHref("+86 138 0000 0000")).toBe("tel:+8613800000000");
  });

  it("returns null for a missing or implausible number", () => {
    expect(buildTelHref(null)).toBeNull();
    expect(buildTelHref("")).toBeNull();
    expect(buildTelHref("not a phone number at all")).toBeNull();
    expect(buildTelHref("123")).toBeNull();
  });
});

describe("buildWhatsAppHref", () => {
  it("builds a wa.me link with digits only and no leading +", () => {
    expect(buildWhatsAppHref("+86 138 0000 0000")).toBe("https://wa.me/8613800000000");
  });

  it("returns null for a missing or implausible number", () => {
    expect(buildWhatsAppHref(undefined)).toBeNull();
    expect(buildWhatsAppHref("abc")).toBeNull();
  });
});
