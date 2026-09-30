import { describe, expect, it } from "vitest";
import { adminLoginPath, sanitizeAdminNextPath } from "./next-path";

describe("sanitizeAdminNextPath", () => {
  it("keeps internal admin paths, with their query string", () => {
    expect(sanitizeAdminNextPath("/admin")).toBe("/admin");
    expect(sanitizeAdminNextPath("/admin/inquiries")).toBe("/admin/inquiries");
    expect(sanitizeAdminNextPath("/admin/inquiries/abc?tab=notes&page=2")).toBe(
      "/admin/inquiries/abc?tab=notes&page=2",
    );
  });

  it.each([
    ["an absolute URL", "https://evil.example/admin"],
    ["a protocol-relative URL", "//evil.example/admin"],
    ["a protocol-relative URL that starts with /admin", "//admin"],
    ["a backslash host", "/\\evil.example"],
    ["a backslash inside the path", "/admin\\..\\evil"],
    ["a javascript: URL", "javascript:alert(1)"],
    ["a data: URL", "data:text/html,hi"],
    ["a relative path", "admin/products"],
    ["the public site", "/en/products"],
    ["the site root", "/"],
    ["a look-alike prefix", "/administrator"],
    ["a look-alike prefix with a dot", "/admin.evil/x"],
    ["dot segments that leave /admin", "/admin/../en"],
    ["encoded dot segments that leave /admin", "/admin/%2e%2e/en"],
    ["a tab smuggled into the scheme", "/\t/evil.example"],
    ["a newline", "/admin\n/x"],
    ["a NUL byte", "/admin\u0000"],
    ["an empty string", ""],
    ["only whitespace", "   "],
    ["a very long value", `/admin/${"a".repeat(3000)}`],
  ])("falls back to /admin for %s", (_name, value) => {
    expect(sanitizeAdminNextPath(value)).toBe("/admin");
  });

  it("falls back for values that are not strings", () => {
    for (const value of [undefined, null, 42, {}, ["/admin/x"]]) {
      expect(sanitizeAdminNextPath(value)).toBe("/admin");
    }
  });

  it("never sends people back to the login page (a redirect loop)", () => {
    expect(sanitizeAdminNextPath("/admin/login")).toBe("/admin");
    expect(sanitizeAdminNextPath("/admin/login?next=/admin/users")).toBe("/admin");
  });

  it("returns the normalised form of what it validated", () => {
    expect(sanitizeAdminNextPath("/admin/./users/../roles")).toBe("/admin/roles");
    expect(sanitizeAdminNextPath("  /admin/users  ")).toBe("/admin/users");
  });

  it("drops a fragment", () => {
    expect(sanitizeAdminNextPath("/admin/users#top")).toBe("/admin/users");
  });
});

describe("adminLoginPath", () => {
  it("is the plain login URL when there is nowhere special to return to", () => {
    expect(adminLoginPath()).toBe("/admin/login");
    expect(adminLoginPath("/admin")).toBe("/admin/login");
    expect(adminLoginPath("https://evil.example")).toBe("/admin/login");
  });

  it("remembers a safe destination, encoded", () => {
    expect(adminLoginPath("/admin/inquiries?status=NEW")).toBe(
      "/admin/login?next=%2Fadmin%2Finquiries%3Fstatus%3DNEW",
    );
  });
});
