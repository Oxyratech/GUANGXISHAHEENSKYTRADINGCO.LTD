import { describe, expect, it } from "vitest";
import {
  EMPTY_VALUE,
  formatBytes,
  formatCountryCode,
  formatRoleName,
  formatUtc,
  humanizeCode,
  toValidDate,
  truncate,
} from "./format";

describe("formatUtc", () => {
  it("writes the UTC date and time with a visible UTC label", () => {
    expect(formatUtc(new Date("2026-06-18T14:05:09.000Z"))).toBe("18 Jun 2026, 14:05 UTC");
  });

  it("uses the UTC fields, whatever the machine's time zone", () => {
    // 23:30 UTC is already the next day in Nanning (UTC+8) and still the same day in Los Angeles.
    expect(formatUtc("2026-12-31T23:30:00Z")).toBe("31 Dec 2026, 23:30 UTC");
  });

  it("can show the date alone, without the label", () => {
    expect(formatUtc("2026-01-05T08:00:00Z", { dateOnly: true })).toBe("5 Jan 2026");
  });

  it("accepts ISO strings and epoch milliseconds", () => {
    expect(formatUtc("2026-06-18T00:00:00Z")).toBe("18 Jun 2026, 00:00 UTC");
    expect(formatUtc(Date.UTC(2026, 5, 18, 1, 2))).toBe("18 Jun 2026, 01:02 UTC");
  });

  it("renders a dash for missing or unreadable values", () => {
    for (const value of [null, undefined, "", "not a date", new Date("nope")]) {
      expect(formatUtc(value)).toBe(EMPTY_VALUE);
    }
  });
});

describe("toValidDate", () => {
  it("returns a Date for valid input and null otherwise", () => {
    expect(toValidDate("2026-06-18T00:00:00Z")?.toISOString()).toBe("2026-06-18T00:00:00.000Z");
    expect(toValidDate("garbage")).toBeNull();
    expect(toValidDate(null)).toBeNull();
  });
});

describe("formatBytes", () => {
  it("scales through B, KB, MB and GB", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatBytes(3 * 1024 ** 3)).toBe("3.0 GB");
  });

  it("drops the decimal once the number has three digits", () => {
    expect(formatBytes(150 * 1024)).toBe("150 KB");
  });

  it("does not invent a size for bad input", () => {
    for (const value of [null, undefined, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(formatBytes(value)).toBe(EMPTY_VALUE);
    }
  });
});

describe("truncate", () => {
  it("leaves short text alone", () => {
    expect(truncate("short", 10)).toBe("short");
    expect(truncate("exactly ten", 11)).toBe("exactly ten");
  });

  it("cuts long text to the limit, ending with an ellipsis", () => {
    const cut = truncate("The quick brown fox jumps", 10);
    expect(cut).toBe("The quick…");
    expect(cut.length).toBeLessThanOrEqual(10);
  });

  it("never splits a surrogate pair", () => {
    const cut = truncate("ab\u{1F600}\u{1F600}cd", 4);
    expect(cut).not.toMatch(/[\ud800-\udbff]$/);
    expect(cut.endsWith("…")).toBe(true);
  });

  it("returns an empty string for null and undefined", () => {
    expect(truncate(null, 5)).toBe("");
    expect(truncate(undefined, 5)).toBe("");
  });
});

describe("formatCountryCode", () => {
  it("names a country from its ISO code, in English", () => {
    expect(formatCountryCode("CN")).toBe("China");
    expect(formatCountryCode("us")).toBe("United States");
  });

  it("passes free-text country names through", () => {
    expect(formatCountryCode("Saudi Arabia")).toBe("Saudi Arabia");
  });

  it("shows an unknown code as the upper-cased code", () => {
    expect(formatCountryCode("zz")).toBe("ZZ");
  });

  it("renders a dash when there is nothing", () => {
    expect(formatCountryCode(null)).toBe(EMPTY_VALUE);
    expect(formatCountryCode("  ")).toBe(EMPTY_VALUE);
  });
});

describe("humanizeCode and formatRoleName", () => {
  it("turns a status code into words", () => {
    expect(humanizeCode("IN_PROGRESS")).toBe("In progress");
    expect(humanizeCode("draft")).toBe("Draft");
  });

  it("uses a role's display name and falls back for unknown keys", () => {
    expect(formatRoleName("SALES_MANAGER")).toBe("Sales / Inquiry Manager");
    expect(formatRoleName("NEW_ROLE")).toBe("New role");
  });
});
