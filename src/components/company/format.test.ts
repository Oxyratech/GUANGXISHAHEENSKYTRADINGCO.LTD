import { formatLongDate } from "./format";

describe("formatLongDate", () => {
  it("writes the establishment date in each language", () => {
    expect(formatLongDate("2026-06-18", "en")).toBe("June 18, 2026");
    expect(formatLongDate("2026-06-18", "zh")).toBe("2026年6月18日");
  });

  it("uses Latin digits in Arabic, like the codes and amounts beside it", () => {
    const arabic = formatLongDate("2026-06-18", "ar");
    expect(arabic).toContain("18");
    expect(arabic).toContain("2026");
    expect(arabic).toMatch(/\p{Script=Arabic}/u);
    expect(arabic).not.toMatch(/[٠-٩]/);
  });

  it("keeps the calendar day whatever the local time zone", () => {
    vi.stubEnv("TZ", "Pacific/Honolulu");
    try {
      expect(formatLongDate("2026-06-18", "en")).toBe("June 18, 2026");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
