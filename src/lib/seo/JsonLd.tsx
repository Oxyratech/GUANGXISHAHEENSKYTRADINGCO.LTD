import type { JsonLdObject } from "./json-ld";

/**
 * JSON.stringify output that is safe to place inside a <script> element. The characters that could
 * end the element or open a comment (`<`, `>`, `&`) and the two line terminators that are legal in
 * JSON but not in JavaScript source (U+2028, U+2029) become \uXXXX escapes, which JSON parsers
 * decode back to the original text. Text such as "</script><script>alert(1)" therefore stays data.
 */
export function serializeJsonLd(data: JsonLdObject | readonly JsonLdObject[]): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** Renders one or more JSON-LD objects as an `application/ld+json` script. Server-renderable. */
export function JsonLd({ data }: { data: JsonLdObject | readonly JsonLdObject[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
