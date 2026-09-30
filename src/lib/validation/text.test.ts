import { describe, expect, it } from "vitest";
import { cleanLine, cleanMultiline, toAsciiDigits } from "./text";

const chars = (...codes: number[]) => String.fromCodePoint(...codes);

describe("cleanLine", () => {
  it("trims and collapses whitespace, line breaks included", () => {
    expect(cleanLine("  Ada \t Lovelace \r\n Ltd  ")).toBe("Ada Lovelace Ltd");
  });

  it("removes control characters", () => {
    expect(cleanLine(`Ad${chars(0, 7, 27, 127, 0x85)}a`)).toBe("Ada");
  });

  it("removes bidirectional overrides and the byte order mark", () => {
    expect(cleanLine(`pay${chars(0x202e)}fdp.exe${chars(0x2066, 0xfeff)}`)).toBe("payfdp.exe");
  });

  it("keeps Arabic, Chinese and the joiners Arabic and Persian text need", () => {
    expect(cleanLine("شركة الأمل")).toBe("شركة الأمل");
    expect(cleanLine("广西沙欣斯凯")).toBe("广西沙欣斯凯");
    const persian = `می${chars(0x200c)}خواهم`;
    expect(cleanLine(persian)).toBe(persian);
  });

  it("treats line and paragraph separators as line breaks", () => {
    expect(cleanLine(`a${chars(0x2028)}b${chars(0x2029)}c`)).toBe("a b c");
  });
});

describe("cleanMultiline", () => {
  it("keeps line breaks as \\n and normalizes their style", () => {
    expect(cleanMultiline("one\r\ntwo\rthree")).toBe("one\ntwo\nthree");
  });

  it("collapses runs of blank lines and trims trailing spaces on a line", () => {
    expect(cleanMultiline("a  \n\n\n\n b\t\n")).toBe("a\n\n b");
  });

  it("still removes control characters", () => {
    expect(cleanMultiline(`a${chars(0)}\nb${chars(0x202a)}`)).toBe("a\nb");
  });

  it("keeps a tab that separates words", () => {
    expect(cleanMultiline("a\tb")).toBe("a\tb");
  });
});

describe("toAsciiDigits", () => {
  it("converts Arabic-Indic, Persian and full-width digits", () => {
    expect(toAsciiDigits("+٨٦ ٧٧١ ٠٠٠١")).toBe("+86 771 0001");
    expect(toAsciiDigits("۰۱۲۳۴۵۶۷۸۹")).toBe("0123456789");
    expect(toAsciiDigits("１２３４")).toBe("1234");
  });

  it("leaves everything else alone", () => {
    expect(toAsciiDigits("+1 (555) 010-0100 ext. 5")).toBe("+1 (555) 010-0100 ext. 5");
    expect(toAsciiDigits("شركة")).toBe("شركة");
  });
});
