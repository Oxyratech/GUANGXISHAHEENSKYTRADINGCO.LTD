// @vitest-environment node
import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import { loadMessages } from "@/i18n/load-messages";
import { LOCALES } from "@/i18n/locales";
import { deliveryWindowFrom } from "./dates";
import { checkAttachment } from "./attachment";
import { contactSchema } from "./contact";
import { createInquirySchema } from "./inquiry";
import { messageKey, parseMessageKey } from "./message-key";

const window = deliveryWindowFrom("2026-06-18");
const inquirySchema = createInquirySchema(window);

/** Every message key the schemas and the upload check can produce, with realistic arguments. */
function emittedKeys(): string[] {
  const inputs: [
    { safeParse(input: unknown): { success: boolean; error?: { issues: { message: string }[] } } },
    unknown,
  ][] = [
    [inquirySchema, {}],
    [
      inquirySchema,
      {
        name: "A",
        company: "B",
        product: "C",
        country: "ZZ",
        email: "x",
        phone: "1",
        whatsapp: "x",
        category: "x",
        destinationCountry: "ZZ",
        requiredDeliveryDate: "2020-01-01",
        consent: false,
      },
    ],
    [inquirySchema, { requiredDeliveryDate: "2100-01-01" }],
    [inquirySchema, { requiredDeliveryDate: "2026-02-30" }],
    [
      inquirySchema,
      { name: "n".repeat(500), quantity: "q".repeat(500), specification: "s".repeat(9000) },
    ],
    [inquirySchema, { name: 1, productSlug: "Bad Slug" }],
    [contactSchema, {}],
    [contactSchema, { name: "n", message: "short", consent: false }],
    [
      contactSchema,
      {
        name: "n".repeat(500),
        email: "e".repeat(300),
        company: "c".repeat(300),
        message: "m".repeat(5000),
      },
    ],
  ];
  const keys = new Set<string>();
  for (const [schema, input] of inputs) {
    const result = schema.safeParse(input);
    for (const issue of result.error?.issues ?? []) keys.add(issue.message);
  }
  const rules = { maxBytes: 5 * 1024 * 1024, extensions: ["pdf"] };
  for (const file of [
    { name: "a.pdf", size: 0 },
    { name: "a.pdf", size: 9 * 1024 * 1024 },
    { name: "a.exe", size: 5 },
  ]) {
    const key = checkAttachment(file, rules);
    if (key) keys.add(key);
  }
  keys.add(messageKey("validation.formExpired"));
  return [...keys];
}

describe("message keys the validation layer can emit", () => {
  const keys = emittedKeys();

  it("covers every kind of message", () => {
    const names = new Set(keys.map((key) => parseMessageKey(key).key));
    for (const expected of [
      "validation.required",
      "validation.email",
      "validation.phone",
      "validation.tooShort",
      "validation.tooLong",
      "validation.invalidCountry",
      "validation.invalidChoice",
      "validation.dateInvalid",
      "validation.dateInPast",
      "validation.dateTooFar",
      "validation.consentRequired",
      "validation.fileTooLarge",
      "validation.fileType",
      "validation.formExpired",
      "validation.invalid",
      "errors.upload.empty",
    ]) {
      expect(names, expected).toContain(expected);
    }
  });

  it.each(LOCALES)("all resolve to text in %s, with their arguments", async (locale) => {
    const messages = await loadMessages(locale);
    const errors: string[] = [];
    const t = createTranslator({
      locale,
      messages,
      onError: (error) => errors.push(error.message),
    });

    for (const key of keys) {
      const { key: path, values } = parseMessageKey(key);
      const text = t(path as never, values as never);
      expect(text, key).toBeTruthy();
      expect(text, key).not.toContain(path);
      expect(text, key).not.toMatch(/[{}]/);
    }
    expect(errors).toEqual([]);
  });

  it("says how many characters in the plural form of each language", async () => {
    const en = createTranslator({ locale: "en", messages: await loadMessages("en") });
    const ar = createTranslator({ locale: "ar", messages: await loadMessages("ar") });
    expect(en("validation.tooShort", { min: 2 })).toContain("2 characters");
    expect(en("validation.tooShort", { min: 1 })).toContain("1 character.");
    expect(ar("validation.tooShort", { min: 2 })).toContain("حرفين");
    expect(ar("validation.tooShort", { min: 10 })).toContain("أحرف");
    expect(ar("validation.tooLong", { max: 120 })).toContain("حرفًا");
  });
});
