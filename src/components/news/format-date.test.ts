import { formatArticleDate } from "./format-date";

describe("formatArticleDate", () => {
  const stamp = "2026-09-30T02:00:00.000Z";

  it("writes a long date in the reader's language", () => {
    expect(formatArticleDate(stamp, "en")).toBe("September 30, 2026");
    expect(formatArticleDate(stamp, "zh")).toBe("2026年9月30日");
    expect(formatArticleDate(stamp, "ar")).toBe("30 سبتمبر 2026");
  });

  it("uses Western digits and the Gregorian calendar in Arabic", () => {
    expect(formatArticleDate(stamp, "ar")).toMatch(/^\d{1,2} \S+ 2026$/);
    expect(formatArticleDate(stamp, "ar")).not.toMatch(/[٠-٩]/);
  });

  it("shows the date in the company's time zone, not the server's", () => {
    // 18:30 UTC on 30 September is already 1 October in China (UTC+8).
    expect(formatArticleDate("2026-09-30T18:30:00.000Z", "en")).toBe("October 1, 2026");
    expect(formatArticleDate("2026-09-30T15:59:00.000Z", "en")).toBe("September 30, 2026");
  });

  it("accepts a Date", () => {
    expect(formatArticleDate(new Date(stamp), "en")).toBe("September 30, 2026");
  });
});
