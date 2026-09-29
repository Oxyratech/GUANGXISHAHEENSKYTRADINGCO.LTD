import { renderToStaticMarkup } from "react-dom/server";
import { JsonLd, serializeJsonLd } from "./JsonLd";
import type { JsonLdObject } from "./json-ld";

const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);
const DANGEROUS = new RegExp(`[<>&${LINE_SEPARATOR}${PARAGRAPH_SEPARATOR}]`);

const hostile: JsonLdObject = {
  "@type": "Thing",
  name: "</script><script>alert(1)</script>",
  description: `a <!-- b --> & c ${LINE_SEPARATOR} d ${PARAGRAPH_SEPARATOR} e`,
  nested: [{ "@type": "Thing", name: "<img src=x onerror=alert(1)>" }],
};

describe("serializeJsonLd", () => {
  it("never emits a character that could end or reshape the script element", () => {
    expect(serializeJsonLd(hostile)).not.toMatch(DANGEROUS);
  });

  it("escapes with JSON \\u sequences, so the data reads back unchanged", () => {
    expect(JSON.parse(serializeJsonLd(hostile))).toEqual(hostile);
    expect(serializeJsonLd({ "@type": "Thing", name: "<" })).toContain("\\u003c");
  });

  it("leaves ordinary text, including Chinese and Arabic, readable", () => {
    const text = { "@type": "Thing", name: "广西沙欣斯凯商贸有限责任公司 · شاهين سكاي" };
    expect(serializeJsonLd(text)).toContain("广西沙欣斯凯商贸有限责任公司 · شاهين سكاي");
  });

  it("serialises an array of objects as a JSON array", () => {
    const parsed: unknown = JSON.parse(serializeJsonLd([{ "@type": "A" }, { "@type": "B" }]));
    expect(parsed).toEqual([{ "@type": "A" }, { "@type": "B" }]);
  });
});

describe("<JsonLd>", () => {
  it("renders one application/ld+json script whose content cannot break out of it", () => {
    const html = renderToStaticMarkup(<JsonLd data={hostile} />);
    expect(html.startsWith('<script type="application/ld+json">')).toBe(true);
    expect(html.match(/<script/g)).toHaveLength(1);
    expect(html.match(/<\/script>/g)).toHaveLength(1);

    const inner = html.slice(html.indexOf(">") + 1, html.lastIndexOf("</script>"));
    expect(inner).not.toMatch(DANGEROUS);
    expect(JSON.parse(inner)).toEqual(hostile);
  });
});
