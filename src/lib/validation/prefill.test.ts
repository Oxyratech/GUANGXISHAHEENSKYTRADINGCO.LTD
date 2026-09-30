import { describe, expect, it } from "vitest";
import { parseInquiryPrefill } from "./prefill";

const prefill = (query: string) => parseInquiryPrefill(new URLSearchParams(query));

describe("parseInquiryPrefill", () => {
  it("reads product, category and quantity", () => {
    expect(
      prefill("product=Steel%20bolts&category=hardware-products&quantity=5000%20pieces"),
    ).toEqual({
      product: "Steel bolts",
      category: "hardware-products",
      quantity: "5000 pieces",
    });
  });

  it("returns nothing for an empty query", () => {
    expect(prefill("")).toEqual({});
  });

  it("treats a lowercase slug as the product reference and shows it as words", () => {
    expect(prefill("product=steel-bolts&category=hardware-products")).toEqual({
      product: "steel bolts",
      productSlug: "steel-bolts",
      category: "hardware-products",
    });
  });

  it("keeps a product name and its slug apart when both are given", () => {
    expect(prefill("product=Steel%20Bolts%20M8&productSlug=steel-bolts-m8")).toEqual({
      product: "Steel Bolts M8",
      productSlug: "steel-bolts-m8",
    });
  });

  it("accepts the 'other' category and drops unknown ones", () => {
    expect(prefill("category=other")).toEqual({ category: "other" });
    expect(prefill("category=weapons")).toEqual({});
    expect(prefill("category=%3Cscript%3E")).toEqual({});
  });

  it("drops values over their limits instead of cutting them", () => {
    expect(prefill(`product=${"p".repeat(201)}`)).toEqual({});
    expect(prefill(`quantity=${"9".repeat(121)}`)).toEqual({});
    expect(prefill(`product=${"p".repeat(200)}`).product).toHaveLength(200);
  });

  it("cleans text and ignores blank values", () => {
    expect(prefill("product=%20%20&quantity=%0A%0A")).toEqual({});
    expect(prefill("quantity=10%09%20units%00")).toEqual({ quantity: "10 units" });
  });

  it("ignores a slug that is not a slug", () => {
    expect(prefill("product=Widget&productSlug=..%2Fadmin")).toEqual({ product: "Widget" });
  });

  it("ignores parameters it does not know", () => {
    expect(prefill("service=import-export&utm_source=x")).toEqual({});
  });
});
