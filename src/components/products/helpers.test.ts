import { describe, expect, it } from "vitest";
import { CATEGORY_SLUGS } from "@/content/categories";
import { contentLanguageProps } from "./content-language";
import { fileTypeLabel, formatFileSize } from "./format-file";
import { getNeighbourCategories } from "./related-categories";

describe("contentLanguageProps", () => {
  it("adds nothing when the text is in the page language", () => {
    expect(contentLanguageProps("zh", "zh")).toEqual({});
    expect(contentLanguageProps("ar", "ar")).toEqual({});
  });

  it("marks English text on an Arabic page as left-to-right English", () => {
    expect(contentLanguageProps("en", "ar")).toEqual({ lang: "en", dir: "ltr" });
  });

  it("marks Arabic text on an English page as right-to-left Arabic", () => {
    expect(contentLanguageProps("ar", "en")).toEqual({ lang: "ar", dir: "rtl" });
  });

  it("uses the BCP 47 tag of Simplified Chinese", () => {
    expect(contentLanguageProps("zh", "en")).toEqual({ lang: "zh-CN", dir: "ltr" });
  });
});

describe("getNeighbourCategories", () => {
  it("returns the next categories in registry order, never the category itself", () => {
    expect(getNeighbourCategories("consumer-goods")).toEqual([
      "apparel-accessories",
      "food-products",
      "household-products",
    ]);
  });

  it("wraps around the end of the registry", () => {
    expect(getNeighbourCategories("medical-protective-supplies")).toEqual([
      "consumer-goods",
      "apparel-accessories",
      "food-products",
    ]);
  });

  it("returns distinct categories for every slug", () => {
    for (const slug of CATEGORY_SLUGS) {
      const neighbours = getNeighbourCategories(slug, 5);
      expect(neighbours).toHaveLength(5);
      expect(new Set(neighbours).size).toBe(5);
      expect(neighbours).not.toContain(slug);
    }
  });

  it("never returns more categories than there are others", () => {
    expect(getNeighbourCategories("metal-products", 50)).toHaveLength(CATEGORY_SLUGS.length - 1);
  });
});

describe("fileTypeLabel", () => {
  it("names the verified type", () => {
    expect(fileTypeLabel("application/pdf", "x.bin")).toBe("PDF");
    expect(
      fileTypeLabel("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "x"),
    ).toBe("XLSX");
    expect(fileTypeLabel("image/jpeg", "x")).toBe("JPG");
  });

  it("falls back to the extension, then to a generic label", () => {
    expect(fileTypeLabel("application/x-unknown", "notes.txt")).toBe("TXT");
    expect(fileTypeLabel("application/x-unknown", "README")).toBe("FILE");
  });
});

describe("formatFileSize", () => {
  it("chooses bytes, kilobytes or megabytes", () => {
    expect(formatFileSize(1_048_576, "en")).toBe("1 MB");
    expect(formatFileSize(1_572_864, "en")).toBe("1.5 MB");
    expect(formatFileSize(2048, "en")).toBe("2 kB");
    expect(formatFileSize(300, "en")).toBe("300 byte");
  });

  it("never goes below zero", () => {
    expect(formatFileSize(-5, "en")).toBe("0 byte");
  });

  it("uses Latin digits in every language", () => {
    for (const locale of ["en", "zh", "ar"] as const) {
      expect(formatFileSize(1_572_864, locale)).toMatch(/1\.5/);
    }
  });
});
