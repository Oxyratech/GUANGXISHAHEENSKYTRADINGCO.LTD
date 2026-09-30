import { describe, expect, it } from "vitest";
import { isPlausiblePhone } from "./phone";

describe("isPlausiblePhone", () => {
  it.each([
    "+86 771 000 0000",
    "+1 (555) 010-0100",
    "0086 771 0000000",
    "771-0000000",
    "+44.20.7946.0000",
    "123456",
    "+123456789012345",
  ])("accepts %s", (value) => {
    expect(isPlausiblePhone(value)).toBe(true);
  });

  it.each([
    "",
    "12345",
    "+1234567890123456",
    "call me",
    "+86 771 abc 0000",
    "+86 771 000 0000 ext. 12",
    "++8677100000",
    "86+7710000000",
    "()-. ",
  ])("rejects %j", (value) => {
    expect(isPlausiblePhone(value)).toBe(false);
  });

  it("does not count the international prefix as digits of the number", () => {
    expect(isPlausiblePhone("00123456789012345")).toBe(true);
    expect(isPlausiblePhone("00123456")).toBe(true);
    expect(isPlausiblePhone("0012345")).toBe(false);
  });
});
