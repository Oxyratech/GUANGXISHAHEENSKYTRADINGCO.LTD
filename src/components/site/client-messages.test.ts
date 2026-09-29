// @vitest-environment node
import { describe, expect, it } from "vitest";
import { loadMessages } from "@/i18n/load-messages";
import { LOCALES } from "@/i18n/locales";
import { CLIENT_NAMESPACES, pickClientMessages } from "./client-messages";

describe("pickClientMessages", () => {
  it.each(LOCALES)("keeps only the client namespaces for %s", async (locale) => {
    const picked = pickClientMessages(await loadMessages(locale));

    expect(Object.keys(picked).sort()).toEqual([...CLIENT_NAMESPACES].sort());
    expect(picked).not.toHaveProperty("services");
    expect(picked).not.toHaveProperty("categories");
    expect(picked).not.toHaveProperty("legal");
  });

  it("names the namespaces the brief asks for", () => {
    expect([...CLIENT_NAMESPACES]).toEqual([
      "common",
      "errors",
      "validation",
      "inquiry",
      "contact",
    ]);
  });

  it("passes the messages through untouched", async () => {
    const all = await loadMessages("en");

    expect(pickClientMessages(all).common).toBe(all.common);
    expect(pickClientMessages(all).errors).toBe(all.errors);
  });
});
