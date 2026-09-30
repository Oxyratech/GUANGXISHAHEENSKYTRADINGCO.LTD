// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseContactListFilters } from "./filters";

describe("parseContactListFilters", () => {
  it("defaults to no filters and newest first", () => {
    expect(parseContactListFilters({})).toEqual({ q: "", status: "", sort: "newest" });
  });

  it("reads a valid status and sort", () => {
    expect(parseContactListFilters({ status: "read", sort: "oldest" })).toEqual({
      q: "",
      status: "READ",
      sort: "oldest",
    });
  });

  it("drops an unknown status instead of erroring", () => {
    expect(parseContactListFilters({ status: "BOGUS" }).status).toBe("");
  });

  it("trims and caps the search text", () => {
    expect(parseContactListFilters({ q: "  acme  " }).q).toBe("acme");
    expect(parseContactListFilters({ q: "x".repeat(500) }).q).toHaveLength(200);
  });
});
