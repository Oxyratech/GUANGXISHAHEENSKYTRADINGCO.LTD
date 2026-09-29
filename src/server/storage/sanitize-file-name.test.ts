// @vitest-environment node
import { describe, expect, it } from "vitest";
import { sanitizeFileName } from "./sanitize-file-name";

const RLO = String.fromCharCode(0x202e);
const LRE = String.fromCharCode(0x202a);
const ISOLATE = String.fromCharCode(0x2066);
const ZERO_WIDTH = String.fromCharCode(0x200b);
const BOM = String.fromCharCode(0xfeff);

describe("sanitizeFileName", () => {
  it("keeps an ordinary name and lower-cases the extension", () => {
    expect(sanitizeFileName("Quotation 2026.PDF")).toBe("Quotation 2026.pdf");
  });

  it("strips directories, both POSIX and Windows style", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFileName("C:\\Users\\Ada\\Desktop\\spec.pdf")).toBe("spec.pdf");
    expect(sanitizeFileName("a/b\\c/d.png")).toBe("d.png");
    expect(sanitizeFileName("/")).toBe("file");
  });

  it("removes control characters", () => {
    expect(sanitizeFileName("spec\u0000\u0007\r\n.pdf")).toBe("spec.pdf");
    expect(sanitizeFileName("a\u0085b\u2028c.pdf")).toBe("abc.pdf");
  });

  it("removes bidi override, embedding and isolate characters (RTL-override spoofing)", () => {
    // "invoice" + RLO + "fdp.exe" renders as "invoiceexe.pdf": the real extension is hidden.
    const spoofed = `invoice${RLO}fdp.exe`;
    const clean = sanitizeFileName(spoofed, "pdf");

    expect(clean).not.toContain(RLO);
    expect(clean).toBe("invoicefdp.pdf");
    expect(sanitizeFileName(`${LRE}a${ISOLATE}b.png`)).toBe("ab.png");
  });

  it("removes zero-width characters and BOMs", () => {
    expect(sanitizeFileName(`${BOM}re${ZERO_WIDTH}port.pdf`)).toBe("report.pdf");
  });

  it("collapses runs of dots and strips leading and trailing dots and spaces", () => {
    expect(sanitizeFileName("my...file..name.pdf")).toBe("my.file.name.pdf");
    expect(sanitizeFileName("...hidden.pdf")).toBe("hidden.pdf");
    expect(sanitizeFileName("name . ")).toBe("name");
    expect(sanitizeFileName(".htaccess")).toBe("htaccess");
  });

  it("replaces characters that are illegal on Windows", () => {
    expect(sanitizeFileName('a<b>c:d"e|f?g*h.pdf')).toBe("a_b_c_d_e_f_g_h.pdf");
  });

  it("guards Windows device names", () => {
    expect(sanitizeFileName("CON.pdf")).toBe("_CON.pdf");
    expect(sanitizeFileName("lpt1", "png")).toBe("_lpt1.png");
    expect(sanitizeFileName("console.pdf")).toBe("console.pdf");
  });

  it("preserves Arabic and Chinese names", () => {
    expect(sanitizeFileName("عرض سعر.pdf")).toBe("عرض سعر.pdf");
    expect(sanitizeFileName("报价单.xlsx")).toBe("报价单.xlsx");
  });

  it("collapses whitespace", () => {
    expect(sanitizeFileName("  a \t\n  b   c.pdf ")).toBe("a b c.pdf");
  });

  it("caps the name length without splitting characters", () => {
    const long = sanitizeFileName(`${"a".repeat(400)}.pdf`);
    expect(long).toBe(`${"a".repeat(100)}.pdf`);

    const emoji = sanitizeFileName(`${"\u{1F600}".repeat(300)}.png`);
    expect(Array.from(emoji.replace(/\.png$/, ""))).toHaveLength(100);
    expect(emoji).not.toMatch(/[\ud800-\udbff](?![\udc00-\udfff])/);
  });

  it("falls back to a neutral name when nothing usable is left", () => {
    expect(sanitizeFileName("")).toBe("file");
    expect(sanitizeFileName("....")).toBe("file");
    expect(sanitizeFileName(`${RLO}${ZERO_WIDTH}`, "pdf")).toBe("file.pdf");
  });

  describe("with a forced extension from the detected type", () => {
    it("replaces whatever extension the client claimed", () => {
      expect(sanitizeFileName("photo.exe", "jpg")).toBe("photo.jpg");
      expect(sanitizeFileName("photo.PNG", "png")).toBe("photo.png");
      expect(sanitizeFileName("photo", "webp")).toBe("photo.webp");
    });

    it("cannot leave a double extension behind", () => {
      expect(sanitizeFileName("invoice.php.png", "png")).toBe("invoice_php.png");
      expect(sanitizeFileName("shell.php.jpg.exe", "jpg")).toBe("shell_php_jpg.jpg");
      expect(sanitizeFileName("v1.2 spec.pdf", "pdf")).toBe("v1_2 spec.pdf");
    });

    it("ignores unsafe characters in the supplied extension", () => {
      expect(sanitizeFileName("a.txt", "../pdf")).toBe("a.pdf");
    });
  });

  describe("without a forced extension", () => {
    it("keeps only short alphanumeric extensions", () => {
      expect(sanitizeFileName("archive.tar.gz")).toBe("archive.tar.gz");
      expect(sanitizeFileName("weird.ex e")).toBe("weird");
      expect(sanitizeFileName("name.averyveryverylongextension")).toBe("name");
    });
  });
});
