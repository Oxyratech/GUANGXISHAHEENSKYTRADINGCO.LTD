// @vitest-environment node
import { isInternationalNumber, isSettingKey, parseSetting, toDialString } from "./setting-keys";
import { mailtoHref, telHref, whatsappHref } from "./contact-links";

describe("international numbers", () => {
  it.each(["+86 771 555 0100", "+8613800000000", "+1 (415) 555-0100", "+44.20.7946.0958"])(
    "accepts %s",
    (value) => {
      expect(isInternationalNumber(value)).toBe(true);
    },
  );

  it.each([
    "0771 555 0100", // no country code
    "0086 771 555 0100", // 00 prefix instead of +
    "+0 771 555 0100", // country codes never start with 0
    "+86", // too short
    "+86 771 abc 0100", // letters
    "+1234567890123456", // 16 digits: beyond E.164
    "tel:+8613800000000",
    "",
  ])("rejects %j", (value) => {
    expect(isInternationalNumber(value)).toBe(false);
  });

  it("strips typing punctuation to the digits a dialler needs", () => {
    expect(toDialString("+1 (415) 555-0100")).toBe("+14155550100");
  });
});

describe("parseSetting", () => {
  it("validates and trims an email", () => {
    expect(parseSetting("contact.email", "  sales@example.com ")).toEqual({
      ok: true,
      value: "sales@example.com",
    });
    expect(parseSetting("contact.email", "sales@")).toEqual({ ok: false, code: "invalid_email" });
  });

  it("keeps a phone number as typed, with spaces collapsed", () => {
    expect(parseSetting("contact.phone", " +86   771  555 0100 ")).toEqual({
      ok: true,
      value: "+86 771 555 0100",
    });
    expect(parseSetting("contact.phone", "771 555")).toEqual({ ok: false, code: "invalid_phone" });
  });

  it("uses its own error code for WhatsApp", () => {
    expect(parseSetting("contact.whatsapp", "hello")).toEqual({
      ok: false,
      code: "invalid_whatsapp",
    });
  });

  it("rejects values that are not strings", () => {
    expect(parseSetting("contact.email", 42).ok).toBe(false);
    expect(parseSetting("contact.phone", null).ok).toBe(false);
  });

  it("recognises only registered keys", () => {
    expect(isSettingKey("contact.email")).toBe(true);
    expect(isSettingKey("contact.fax")).toBe(false);
    expect(isSettingKey("toString")).toBe(false);
  });
});

describe("contact links", () => {
  it("builds mailto, tel and WhatsApp URLs from validated values", () => {
    expect(mailtoHref("sales@example.com")).toBe("mailto:sales@example.com");
    expect(mailtoHref("a+b@example.com")).toBe("mailto:a%2Bb@example.com");
    expect(telHref("+86 771 555 0100")).toBe("tel:+867715550100");
    expect(whatsappHref("+86 138 0000 0000")).toBe("https://wa.me/8613800000000");
  });
});
