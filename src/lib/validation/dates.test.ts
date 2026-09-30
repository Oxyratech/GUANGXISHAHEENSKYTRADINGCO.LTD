import { describe, expect, it } from "vitest";
import {
  addYears,
  deliveryWindowFrom,
  isIsoDate,
  localDeliveryWindow,
  serverDeliveryWindow,
} from "./dates";

describe("isIsoDate", () => {
  it.each(["2026-06-18", "2028-02-29", "2026-12-31"])("accepts %s", (value) => {
    expect(isIsoDate(value)).toBe(true);
  });

  it.each([
    "",
    "2026-6-18",
    "18/06/2026",
    "2026-02-30",
    "2027-02-29",
    "2026-13-01",
    "2026-00-10",
    "2026-06-18T00:00:00Z",
    "not a date",
  ])("rejects %j", (value) => {
    expect(isIsoDate(value)).toBe(false);
  });
});

describe("addYears", () => {
  it("keeps the calendar day", () => {
    expect(addYears("2026-06-18", 3)).toBe("2029-06-18");
  });

  it("moves 29 February to 28 February in a common year", () => {
    expect(addYears("2028-02-29", 1)).toBe("2029-02-28");
    expect(addYears("2028-02-29", 4)).toBe("2032-02-29");
  });
});

describe("delivery windows", () => {
  it("lets a date be today or later, up to three years ahead, by the visitor's calendar", () => {
    expect(deliveryWindowFrom("2026-06-18")).toEqual({
      earliest: "2026-06-18",
      latest: "2029-06-18",
    });
    // Noon avoids a day boundary in whichever time zone the tests run.
    expect(localDeliveryWindow(new Date(2026, 5, 18, 12))).toEqual({
      earliest: "2026-06-18",
      latest: "2029-06-18",
    });
  });

  it("gives the server a day of grace at both ends", () => {
    expect(serverDeliveryWindow(new Date("2026-06-18T12:00:00Z"))).toEqual({
      earliest: "2026-06-17",
      latest: "2029-06-19",
    });
  });

  it("uses the UTC date, not the machine's", () => {
    // 23:30 in UTC-12 is already the next day in UTC.
    expect(serverDeliveryWindow(new Date("2026-06-19T11:30:00Z")).earliest).toBe("2026-06-18");
    expect(serverDeliveryWindow(new Date("2026-06-18T00:30:00Z")).earliest).toBe("2026-06-17");
  });
});
