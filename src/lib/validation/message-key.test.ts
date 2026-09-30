import { describe, expect, it } from "vitest";
import {
  messageKey,
  normalizeMessageKey,
  parseMessageKey,
  resolveMessage,
  type MessageTranslator,
} from "./message-key";

describe("messageKey", () => {
  it("is the plain key without arguments", () => {
    expect(messageKey("validation.required")).toBe("validation.required");
    expect(messageKey("validation.required", {})).toBe("validation.required");
  });

  it("carries arguments as a query string", () => {
    expect(messageKey("validation.tooLong", { max: 120 })).toBe("validation.tooLong?max=120");
    expect(messageKey("validation.phone", { min: 6, max: 15 })).toBe(
      "validation.phone?min=6&max=15",
    );
  });
});

describe("parseMessageKey", () => {
  it("returns the path and numeric arguments as numbers", () => {
    expect(parseMessageKey("validation.tooLong?max=120")).toEqual({
      key: "validation.tooLong",
      values: { max: 120 },
    });
    expect(parseMessageKey("validation.fileTooLarge?max=2.5").values).toEqual({ max: 2.5 });
  });

  it("keeps a non-numeric argument as text", () => {
    expect(parseMessageKey("errors.form.generic?name=Ali").values).toEqual({ name: "Ali" });
  });

  it("reads keys of the errors namespace", () => {
    expect(parseMessageKey("errors.upload.tooLarge").key).toBe("errors.upload.tooLarge");
  });

  it.each([
    "Invalid input: expected string, received undefined",
    "",
    "unknown.key",
    "validation.",
    "validation..x",
    "../validation.required",
  ])("replaces %j with the generic message", (input) => {
    expect(parseMessageKey(input)).toEqual({ key: "validation.invalid", values: {} });
  });
});

describe("normalizeMessageKey", () => {
  it("keeps our keys and replaces sentences", () => {
    expect(normalizeMessageKey("validation.tooShort?min=2")).toBe("validation.tooShort?min=2");
    expect(normalizeMessageKey("Too small: expected string to have >=2 characters")).toBe(
      "validation.invalid",
    );
  });
});

describe("resolveMessage", () => {
  it("calls the translator with the key and its arguments", () => {
    const calls: unknown[][] = [];
    const t: MessageTranslator = (key, values) => {
      calls.push([key, values]);
      return "text";
    };
    expect(resolveMessage(t, "validation.tooLong?max=120")).toBe("text");
    expect(calls).toEqual([["validation.tooLong", { max: 120 }]]);
  });
});
