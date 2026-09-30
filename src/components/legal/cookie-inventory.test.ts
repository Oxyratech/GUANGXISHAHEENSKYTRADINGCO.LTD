// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { LOCALES } from "@/i18n/locales";
import { routing } from "@/i18n/routing";
import arLegal from "@/messages/ar/legal.json";
import enLegal from "@/messages/en/legal.json";
import zhLegal from "@/messages/zh/legal.json";
import { ABSOLUTE_TIMEOUT_MS, IDLE_TIMEOUT_MS } from "@/server/auth/session-policy";
import { COOKIES } from "./cookie-inventory";

/*
 * The cookie policy is a factual statement about the code. These tests read the code the policy
 * describes, so that changing a cookie without updating the policy fails here.
 */
const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const read = (relative: string) => readFileSync(`${ROOT}${relative}`, "utf8");

/** Non-test source files under a repo-relative folder, as repo-relative paths. */
function sourceFiles(folder: string): string[] {
  return readdirSync(`${ROOT}${folder}`).flatMap((entry) => {
    const relative = `${folder}/${entry}`;
    if (statSync(`${ROOT}${relative}`).isDirectory()) {
      return entry === "generated" ? [] : sourceFiles(relative);
    }
    return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [relative] : [];
  });
}

const IMPORTS_COOKIE_STORE = /import\s*\{[^}]*\bcookies\b[^}]*\}\s*from\s*"next\/headers"/;
const SETS_A_COOKIE = /\.cookies\.set\(|document\.cookie\s*=|Set-Cookie:/i;

const CATALOGUE = { en: enLegal, zh: zhLegal, ar: arLegal };

describe("cookie inventory", () => {
  it("lists exactly the language cookie and the admin session cookie", () => {
    expect(COOKIES.map((cookie) => cookie.id)).toEqual(["language", "session"]);
  });

  it("names the locale cookie next-intl actually sets", () => {
    // Disabling it would make the policy list a cookie that does not exist; adding maxAge would
    // make "no fixed expiry" untrue.
    const cookie = routing.localeCookie;
    expect(cookie).not.toBe(false);
    const options = typeof cookie === "object" ? cookie : {};
    expect(options.name ?? "NEXT_LOCALE").toBe(COOKIES[0].name);
    expect(options).not.toHaveProperty("maxAge");
    expect(options).not.toHaveProperty("expires");
  });

  it("names the admin session cookie the auth code sets in production", () => {
    const source = read("src/server/auth/session.ts");
    expect(source).toContain(`"${COOKIES[1].name}"`);
    expect(source).toMatch(/IS_PRODUCTION \? "__Host-/);
  });

  it("sets no cookie anywhere else in the application code", () => {
    const setters = sourceFiles("src").filter((file) => {
      const source = read(file);
      return (
        file !== "src/server/auth/session.ts" &&
        ((IMPORTS_COOKIE_STORE.test(source) && /\.set\(/.test(source)) ||
          SETS_A_COOKIE.test(source))
      );
    });
    expect(setters).toEqual([]);
  });

  it("describes both cookies in every language", () => {
    for (const locale of LOCALES) {
      const { rows } = CATALOGUE[locale].cookies.table;
      expect(Object.keys(rows), locale).toEqual(COOKIES.map((cookie) => cookie.id));
    }
  });

  it("states the session lifetime the auth policy enforces", () => {
    expect(ABSOLUTE_TIMEOUT_MS).toBe(7 * 24 * 60 * 60 * 1000);
    expect(IDLE_TIMEOUT_MS).toBe(8 * 60 * 60 * 1000);
    for (const locale of LOCALES) {
      const { lifetime } = CATALOGUE[locale].cookies.table.rows.session;
      expect(lifetime, locale).toMatch(/\b7\b/);
      expect(lifetime, locale).toMatch(/\b8\b/);
    }
  });
});
