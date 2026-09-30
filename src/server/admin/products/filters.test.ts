// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseProductListFilters } from "./filters";

describe("parseProductListFilters", () => {
  it("defaults to no filters and 'updated' sort", () => {
    expect(parseProductListFilters({})).toEqual({
      q: "",
      status: "",
      category: "",
      sort: "updated",
    });
  });

  it("normalises status case and validates it against PUBLISH_STATUSES", () => {
    expect(parseProductListFilters({ status: "published" }).status).toBe("PUBLISHED");
    expect(parseProductListFilters({ status: "bogus" }).status).toBe("");
  });

  it("normalises category case and validates it against known categories", () => {
    expect(parseProductListFilters({ category: "Hardware-Products" }).category).toBe(
      "hardware-products",
    );
    expect(parseProductListFilters({ category: "not-a-category" }).category).toBe("");
  });

  it("falls back to 'updated' for an unknown sort value", () => {
    expect(parseProductListFilters({ sort: "bogus" }).sort).toBe("updated");
    expect(parseProductListFilters({ sort: "name" }).sort).toBe("name");
  });

  it("truncates the search term to 200 characters", () => {
    expect(parseProductListFilters({ q: "a".repeat(250) }).q).toHaveLength(200);
  });

  it("takes the first value when a param repeats", () => {
    expect(parseProductListFilters({ q: ["first", "second"] }).q).toBe("first");
  });
});
