// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  createProductSchema,
  isPublishStatus,
  productCoreSchema,
  productTranslationSchema,
  slugField,
  updateProductCoreSchema,
} from "./schemas";

describe("slugField", () => {
  it.each(["steel-wire-mesh", "abc", "a1-b2"])("accepts %s", (value) => {
    expect(slugField.safeParse(value).success).toBe(true);
  });

  it.each([
    "Steel-Wire",
    "steel_wire",
    "steel wire",
    "-leading",
    "trailing-",
    "double--hyphen",
    "",
  ])("rejects %s", (value) => {
    expect(slugField.safeParse(value).success).toBe(false);
  });

  it("rejects a slug longer than 120 characters (Product.slug column size)", () => {
    expect(slugField.safeParse("a".repeat(121)).success).toBe(false);
    expect(slugField.safeParse("a".repeat(120)).success).toBe(true);
  });
});

describe("isPublishStatus", () => {
  it("accepts the three known statuses and rejects anything else", () => {
    expect(isPublishStatus("DRAFT")).toBe(true);
    expect(isPublishStatus("PUBLISHED")).toBe(true);
    expect(isPublishStatus("ARCHIVED")).toBe(true);
    expect(isPublishStatus("published")).toBe(false);
    expect(isPublishStatus("DELETED")).toBe(false);
  });
});

describe("productCoreSchema / createProductSchema", () => {
  const valid = {
    name: "Steel Wire Mesh",
    slug: "steel-wire-mesh",
    categorySlug: "hardware-products",
    origin: "Guangxi",
    sortOrder: "0",
    featured: "on",
  };

  it("accepts a fully valid submission and coerces sortOrder/featured", () => {
    const result = createProductSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortOrder).toBe(0);
      expect(result.data.featured).toBe(true);
    }
  });

  it("rejects an unknown category slug", () => {
    const result = productCoreSchema.safeParse({ ...valid, categorySlug: "not-a-category" });
    expect(result.success).toBe(false);
  });

  it("requires a name", () => {
    const result = createProductSchema.safeParse({ ...valid, name: "" });
    expect(result.success).toBe(false);
  });

  it("treats a blank origin as absent", () => {
    const result = createProductSchema.safeParse({ ...valid, origin: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.origin).toBeUndefined();
  });
});

describe("updateProductCoreSchema", () => {
  it("has no name field (that lives in the translation form)", () => {
    const result = updateProductCoreSchema.safeParse({
      id: "11111111-1111-1111-1111-111111111111",
      version: "1",
      slug: "steel-wire-mesh",
      categorySlug: "hardware-products",
      origin: "",
      sortOrder: "0",
      featured: "",
    });
    expect(result.success).toBe(true);
    if (result.success) expect("name" in result.data).toBe(false);
  });
});

describe("productTranslationSchema", () => {
  const base = {
    id: "11111111-1111-1111-1111-111111111111",
    version: "0",
    locale: "en",
    shortDescription: "",
    description: "",
    applications: "",
    packagingInfo: "",
  };

  it("requires a name for every locale (ProductTranslation.name is NOT NULL)", () => {
    expect(productTranslationSchema.safeParse({ ...base, name: "" }).success).toBe(false);
    expect(productTranslationSchema.safeParse({ ...base, name: "Steel Wire Mesh" }).success).toBe(
      true,
    );
  });

  it("rejects a locale outside en/zh/ar", () => {
    const result = productTranslationSchema.safeParse({ ...base, locale: "fr", name: "x" });
    expect(result.success).toBe(false);
  });

  it("caps Markdown fields at 20,000 characters", () => {
    const tooLong = "a".repeat(20_001);
    const result = productTranslationSchema.safeParse({ ...base, name: "x", description: tooLong });
    expect(result.success).toBe(false);
  });
});
