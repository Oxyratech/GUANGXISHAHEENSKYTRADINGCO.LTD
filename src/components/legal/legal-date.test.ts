import { formatLegalDate } from "./legal-date";

describe("formatLegalDate", () => {
  it("writes the date in the language of the page", () => {
    expect(formatLegalDate("2026-09-30", "en")).toBe("September 30, 2026");
    expect(formatLegalDate("2026-09-30", "zh")).toBe("2026年9月30日");
    expect(formatLegalDate("2026-09-30", "ar")).toMatch(/^30 .+ 2026$/);
  });

  it("keeps Latin digits in Arabic, like the rest of the site", () => {
    expect(formatLegalDate("2026-09-30", "ar")).not.toMatch(/[٠-٩]/);
  });

  it("never shifts the calendar day, whatever the time zone of the server", () => {
    const zone = process.env.TZ;
    try {
      for (const tz of ["Pacific/Kiritimati", "Pacific/Pago_Pago", "UTC"]) {
        process.env.TZ = tz;
        expect(formatLegalDate("2026-01-01", "zh")).toBe("2026年1月1日");
      }
    } finally {
      if (zone === undefined) delete process.env.TZ;
      else process.env.TZ = zone;
    }
  });
});
