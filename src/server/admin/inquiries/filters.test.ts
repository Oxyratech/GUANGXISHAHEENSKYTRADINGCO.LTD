// @vitest-environment node
import { describe, expect, it } from "vitest";
import { endOfDayUtc, parseInquiryListFilters, startOfDayUtc } from "./filters";

describe("parseInquiryListFilters", () => {
  it("defaults to no filters and the newest-first sort", () => {
    expect(parseInquiryListFilters({})).toEqual({
      q: "",
      status: "",
      category: "",
      country: "",
      assignee: "",
      from: "",
      to: "",
      sort: "newest",
    });
  });

  it("reads valid values and normalises case", () => {
    const filters = parseInquiryListFilters({
      q: "  Acme  ",
      status: "new",
      category: "CONSUMER-GOODS",
      country: "cn",
      assignee: "11111111-1111-1111-1111-111111111111",
      from: "2026-01-01",
      to: "2026-01-31",
      sort: "oldest",
    });

    expect(filters).toEqual({
      q: "Acme",
      status: "NEW",
      category: "consumer-goods",
      country: "CN",
      assignee: "11111111-1111-1111-1111-111111111111",
      from: "2026-01-01",
      to: "2026-01-31",
      sort: "oldest",
    });
  });

  it("accepts the unassigned sentinel", () => {
    expect(parseInquiryListFilters({ assignee: "unassigned" }).assignee).toBe("unassigned");
  });

  it("drops anything invalid instead of erroring", () => {
    const filters = parseInquiryListFilters({
      status: "NOT_A_STATUS",
      category: "not-a-category",
      country: "ZZ",
      assignee: "not-a-guid",
      from: "not-a-date",
      to: "2026-13-40",
      sort: "banana",
    });

    expect(filters).toEqual({
      q: "",
      status: "",
      category: "",
      country: "",
      assignee: "",
      from: "",
      to: "",
      sort: "newest",
    });
  });

  it("takes only the first value of a repeated key", () => {
    expect(parseInquiryListFilters({ q: ["a", "b"] }).q).toBe("a");
  });

  it("caps an absurdly long search string", () => {
    const filters = parseInquiryListFilters({ q: "x".repeat(500) });
    expect(filters.q).toHaveLength(200);
  });
});

describe("day boundaries", () => {
  it("gives the UTC start and end instants of a calendar day", () => {
    expect(startOfDayUtc("2026-06-18").toISOString()).toBe("2026-06-18T00:00:00.000Z");
    expect(endOfDayUtc("2026-06-18").toISOString()).toBe("2026-06-18T23:59:59.999Z");
  });
});
