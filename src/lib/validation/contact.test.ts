import { describe, expect, it } from "vitest";
import { contactSchema, type ContactInput } from "./contact";

const VALID: ContactInput = {
  name: "Li Wei",
  email: "li.wei@example.com",
  message: "Could you tell me which product areas you cover?",
  consent: true,
};

function problems(input: unknown): Record<string, string> {
  const result = contactSchema.safeParse(input);
  if (result.success) return {};
  const found: Record<string, string> = {};
  for (const issue of result.error.issues) found[String(issue.path[0] ?? "")] ??= issue.message;
  return found;
}

describe("contact schema", () => {
  it("accepts the required fields and defaults the optional ones to empty strings", () => {
    expect(contactSchema.parse(VALID)).toEqual({ ...VALID, company: "", phone: "", country: "" });
  });

  it("cleans text and the email", () => {
    const result = contactSchema.parse({
      ...VALID,
      name: "  Li   Wei ",
      email: " LI.Wei@Example.com ",
      message: "  first line\r\n\r\n\r\n\r\nsecond line ",
    });
    expect(result.name).toBe("Li Wei");
    expect(result.email).toBe("li.wei@example.com");
    expect(result.message).toBe("first line\n\nsecond line");
  });

  it.each(["name", "email", "message"] as const)("requires %s", (field) => {
    expect(problems({ ...VALID, [field]: "" })[field]).toBe("validation.required");
    expect(problems({ ...VALID, [field]: undefined })[field]).toBe("validation.required");
  });

  it("requires consent", () => {
    expect(problems({ ...VALID, consent: false }).consent).toBe("validation.consentRequired");
  });

  it("holds the message to 10 to 4000 characters, the width of the column", () => {
    expect(problems({ ...VALID, message: "short" }).message).toBe("validation.tooShort?min=10");
    expect(problems({ ...VALID, message: "m".repeat(4000) })).toEqual({});
    expect(problems({ ...VALID, message: "m".repeat(4001) }).message).toBe(
      "validation.tooLong?max=4000",
    );
  });

  it("checks the optional country and phone only when given", () => {
    expect(problems({ ...VALID, country: "CN", phone: "+86 771 000 0000" })).toEqual({});
    expect(problems({ ...VALID, country: "Mars" }).country).toBe("validation.invalidCountry");
    expect(problems({ ...VALID, phone: "abc" }).phone).toBe("validation.phone?min=6&max=15");
  });

  it("limits company to 200 characters", () => {
    expect(problems({ ...VALID, company: "c".repeat(201) }).company).toBe(
      "validation.tooLong?max=200",
    );
  });

  it("rejects unexpected keys", () => {
    const result = contactSchema.safeParse({ ...VALID, status: "REPLIED" });
    expect(result.success).toBe(false);
  });
});
