import { classifyUrl } from "./markdown-url";

describe("classifyUrl", () => {
  it.each([
    ["/inquiry", "internal"],
    ["/business/import-export?x=1#top", "internal"],
    ["/media/3f2504e0-4f89-41d3-9a0c-0305e82c3301", "internal"],
    ["#section", "anchor"],
    ["https://example.com/page", "external"],
    ["HTTP://Example.com", "external"],
    ["mailto:hello@example.com", "contact"],
    ["tel:+8613800000000", "contact"],
    ["  https://example.com  ", "external"],
  ])("accepts %s as %s", (url, kind) => {
    expect(classifyUrl(url)).toEqual({ kind });
  });

  it.each([
    ["nothing", undefined],
    ["an empty string", ""],
    ["a lone #", "#"],
    ["javascript:", "javascript:alert(1)"],
    ["javascript: in mixed case", "JaVaScRiPt:alert(1)"],
    ["javascript: hidden by a tab", "java\tscript:alert(1)"],
    ["javascript: hidden by a newline", "java\nscript:alert(1)"],
    ["javascript: behind a control character", "\u0001javascript:alert(1)"],
    ["data:", "data:text/html,<script>1</script>"],
    ["vbscript:", "vbscript:msgbox(1)"],
    ["file:", "file:///etc/passwd"],
    ["ftp:", "ftp://example.com"],
    ["a protocol-relative address", "//example.com"],
    ["a backslash that browsers read as a slash", "/\\example.com"],
    ["a bare relative path", "docs/page.html"],
    ["an http address without a host", "https://"],
    ["an address with a space", "https://example.com/a b"],
  ])("rejects %s", (_label, url) => {
    expect(classifyUrl(url)).toBeNull();
  });
});
