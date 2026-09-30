import { describe, expect, it } from "vitest";
import { CATEGORY_SLUGS } from "@/content/categories";
import { deliveryWindowFrom } from "./dates";
import {
  CATEGORY_OTHER,
  createInquiryFormSchema,
  createInquirySchema,
  type InquiryInput,
} from "./inquiry";
import { FIELD_LIMITS } from "./limits";

const window = deliveryWindowFrom("2026-06-18");
const schema = createInquirySchema(window);

const VALID: InquiryInput = {
  name: "Amira Hassan",
  company: "Nile Trading LLC",
  country: "EG",
  email: "amira@example.com",
  product: "Stainless steel fasteners",
  consent: true,
};

/** Message of the first problem of each field, keyed by field name. */
function problems(input: unknown, use = schema): Record<string, string> {
  const result = use.safeParse(input);
  if (result.success) return {};
  const found: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? "");
    found[field] ??= issue.message;
  }
  return found;
}

describe("inquiry schema: valid input", () => {
  it("accepts the required fields alone and fills the optional ones with empty strings", () => {
    const result = schema.parse(VALID);
    expect(result).toEqual({
      ...VALID,
      phone: "",
      whatsapp: "",
      productSlug: "",
      category: "",
      quantity: "",
      specification: "",
      targetPrice: "",
      destinationCountry: "",
      requiredDeliveryDate: "",
      additionalRequirements: "",
    });
  });

  it("accepts a complete inquiry", () => {
    const result = schema.parse({
      ...VALID,
      phone: "+20 100 123 4567",
      whatsapp: "+20 100 123 4567",
      productSlug: "steel-fasteners",
      category: "hardware-products",
      quantity: "5,000 pieces",
      specification: "M8, A2-70\nDIN 933",
      targetPrice: "USD 0.05 per piece",
      destinationCountry: "EG",
      requiredDeliveryDate: "2026-12-01",
      additionalRequirements: "Packed in cartons of 500.",
    });
    expect(result.category).toBe("hardware-products");
    expect(result.specification).toBe("M8, A2-70\nDIN 933");
    expect(result.requiredDeliveryDate).toBe("2026-12-01");
  });
});

describe("inquiry schema: cleaning", () => {
  it("trims, collapses whitespace and strips control characters from one-line text", () => {
    const result = schema.parse({
      ...VALID,
      name: "  Amira \t Hassan \u0000",
      company: "  Nile\nTrading ",
    });
    expect(result.name).toBe("Amira Hassan");
    expect(result.company).toBe("Nile Trading");
  });

  it("keeps line breaks in the long text fields", () => {
    const result = schema.parse({ ...VALID, specification: "  line one\r\nline two  " });
    expect(result.specification).toBe("line one\nline two");
  });

  it("lower-cases and trims the email", () => {
    expect(schema.parse({ ...VALID, email: "  Amira@Example.COM " }).email).toBe(
      "amira@example.com",
    );
  });

  it("upper-cases country codes", () => {
    expect(
      schema.parse({ ...VALID, country: " eg ", destinationCountry: "cn" }).destinationCountry,
    ).toBe("CN");
  });

  it("turns Arabic-Indic digits in a phone number into ASCII", () => {
    expect(schema.parse({ ...VALID, phone: "+٢٠ ١٠٠ ١٢٣ ٤٥٦٧" }).phone).toBe("+20 100 123 4567");
  });

  it("measures the cleaned value: padding does not count towards a limit", () => {
    const padded = ` ${"a".repeat(FIELD_LIMITS.name.max)} `;
    expect(problems({ ...VALID, name: padded })).toEqual({});
  });
});

describe("inquiry schema: required fields", () => {
  it.each(["name", "company", "country", "email", "product"] as const)(
    "reports %s as required when it is missing or blank",
    (field) => {
      expect(problems({ ...VALID, [field]: undefined })[field]).toBe("validation.required");
      expect(problems({ ...VALID, [field]: "   " })[field]).toBe("validation.required");
    },
  );

  it("requires consent", () => {
    expect(problems({ ...VALID, consent: false }).consent).toBe("validation.consentRequired");
    expect(problems({ ...VALID, consent: undefined }).consent).toBe("validation.consentRequired");
    expect(problems({ ...VALID, consent: "true" }).consent).toBe("validation.consentRequired");
  });
});

describe("inquiry schema: lengths match the database columns", () => {
  it("names the minimum", () => {
    expect(problems({ ...VALID, name: "A" }).name).toBe("validation.tooShort?min=2");
    expect(problems({ ...VALID, company: "X" }).company).toBe("validation.tooShort?min=2");
    expect(problems({ ...VALID, product: "P" }).product).toBe("validation.tooShort?min=2");
  });

  it.each([
    ["name", 120],
    ["company", 200],
    ["product", 200],
    ["quantity", 120],
    ["specification", 4000],
    ["targetPrice", 120],
    ["additionalRequirements", 4000],
    ["phone", 40],
  ] as const)("allows %s up to %i characters and rejects one more", (field, max) => {
    const value = field === "phone" ? "1".repeat(max) : "a".repeat(max);
    // A 40-digit phone is too long a number, not too long a text; check the text limit separately.
    if (field !== "phone") expect(problems({ ...VALID, [field]: value })[field]).toBeUndefined();
    expect(problems({ ...VALID, [field]: `${value}a` })[field]).toBe(
      `validation.tooLong?max=${max}`,
    );
  });

  it("limits the email to 254 characters", () => {
    const long = `${"a".repeat(250)}@example.com`;
    expect(problems({ ...VALID, email: long }).email).toBe("validation.tooLong?max=254");
  });
});

describe("inquiry schema: email", () => {
  it.each([
    "amira",
    "amira@",
    "@example.com",
    "amira@example",
    "a b@example.com",
    "a@@example.com",
  ])("rejects %j", (email) => {
    expect(problems({ ...VALID, email }).email).toBe("validation.email");
  });

  it.each(["a@example.com", "first.last+tag@sub.example.co.uk"])("accepts %s", (email) => {
    expect(problems({ ...VALID, email }).email).toBeUndefined();
  });
});

describe("inquiry schema: phone and WhatsApp", () => {
  it("asks for at least 6 digits and reports the limits", () => {
    expect(problems({ ...VALID, phone: "123" }).phone).toBe("validation.phone?min=6&max=15");
    expect(problems({ ...VALID, whatsapp: "call me" }).whatsapp).toBe(
      "validation.phone?min=6&max=15",
    );
  });

  it("accepts the usual international spellings", () => {
    expect(
      problems({ ...VALID, phone: "+86 (771) 000-0000", whatsapp: "0086 771 0000000" }),
    ).toEqual({});
  });
});

describe("inquiry schema: countries", () => {
  it.each(["China", "ZZ", "C", "CHN", "12"])("rejects %j as a country", (value) => {
    expect(problems({ ...VALID, country: value }).country).toBe("validation.invalidCountry");
    expect(problems({ ...VALID, destinationCountry: value }).destinationCountry).toBe(
      "validation.invalidCountry",
    );
  });

  it("allows the destination country to stay empty but not the country", () => {
    expect(problems({ ...VALID, destinationCountry: "" })).toEqual({});
    expect(problems({ ...VALID, country: "" }).country).toBe("validation.required");
  });
});

describe("inquiry schema: category", () => {
  it.each([...CATEGORY_SLUGS, CATEGORY_OTHER, ""])("accepts %j", (category) => {
    expect(problems({ ...VALID, category })).toEqual({});
  });

  it("rejects anything that is not one of the twelve categories or 'other'", () => {
    expect(problems({ ...VALID, category: "weapons" }).category).toBe("validation.invalidChoice");
    expect(problems({ ...VALID, category: "Consumer Goods" }).category).toBe(
      "validation.invalidChoice",
    );
  });
});

describe("inquiry schema: required delivery date (today 2026-06-18)", () => {
  const date = (requiredDeliveryDate: string) => problems({ ...VALID, requiredDeliveryDate });

  it("accepts today, a later date and exactly three years ahead", () => {
    expect(date("2026-06-18")).toEqual({});
    expect(date("2026-06-19")).toEqual({});
    expect(date("2029-06-18")).toEqual({});
  });

  it("rejects a date in the past", () => {
    expect(date("2026-06-17").requiredDeliveryDate).toBe("validation.dateInPast");
    expect(date("2020-01-01").requiredDeliveryDate).toBe("validation.dateInPast");
  });

  it("rejects a date more than three years ahead", () => {
    expect(date("2029-06-19").requiredDeliveryDate).toBe("validation.dateTooFar?years=3");
    expect(date("2100-01-01").requiredDeliveryDate).toBe("validation.dateTooFar?years=3");
  });

  it("rejects dates that do not exist or are not written as YYYY-MM-DD", () => {
    expect(date("2026-02-30").requiredDeliveryDate).toBe("validation.dateInvalid");
    expect(date("18/06/2026").requiredDeliveryDate).toBe("validation.dateInvalid");
    expect(date("soon").requiredDeliveryDate).toBe("validation.dateInvalid");
  });

  it("leaves an empty date alone", () => {
    expect(date("")).toEqual({});
  });
});

describe("inquiry schema: product reference", () => {
  it("accepts a slug and rejects anything else", () => {
    expect(problems({ ...VALID, productSlug: "steel-fasteners" })).toEqual({});
    expect(problems({ ...VALID, productSlug: "Steel Fasteners" }).productSlug).toBe(
      "validation.invalid",
    );
    expect(problems({ ...VALID, productSlug: "../admin" }).productSlug).toBe("validation.invalid");
    expect(problems({ ...VALID, productSlug: "a".repeat(121) }).productSlug).toBe(
      "validation.tooLong?max=120",
    );
  });
});

describe("inquiry schema: unexpected keys and types", () => {
  it("rejects a key the form does not have", () => {
    const result = schema.safeParse({ ...VALID, role: "ADMIN" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ code: "unrecognized_keys", keys: ["role"] }),
      );
    }
  });

  it("answers with message keys for wrong types, never with a sentence", () => {
    const found = problems({ ...VALID, name: 42, phone: {}, quantity: ["1"], consent: "yes" });
    for (const message of Object.values(found)) expect(message).toMatch(/^validation\./);
  });
});

describe("inquiry form schema (browser)", () => {
  const upload = {
    maxBytes: 5 * 1024 * 1024,
    extensions: ["pdf", "jpg", "png", "webp", "docx", "xlsx"],
  };
  const formSchema = createInquiryFormSchema(window, upload);

  it("accepts no file and a small allowed file", () => {
    expect(problems({ ...VALID, attachment: null }, formSchema)).toEqual({});
    expect(
      problems({ ...VALID, attachment: { name: "spec.pdf", size: 1024 } }, formSchema),
    ).toEqual({});
  });

  it("names the problem with a file", () => {
    expect(
      problems({ ...VALID, attachment: { name: "big.pdf", size: 6 * 1024 * 1024 } }, formSchema)
        .attachment,
    ).toBe("validation.fileTooLarge?max=5");
    expect(
      problems({ ...VALID, attachment: { name: "run.exe", size: 100 } }, formSchema).attachment,
    ).toBe("validation.fileType");
    expect(
      problems({ ...VALID, attachment: { name: "empty.pdf", size: 0 } }, formSchema).attachment,
    ).toBe("errors.upload.empty");
  });
});
