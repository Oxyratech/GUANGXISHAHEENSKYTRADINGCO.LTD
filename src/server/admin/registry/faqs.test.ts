// @vitest-environment node
import { describe, expect, it } from "vitest";
import { FAQ_GROUPS } from "@/components/faq/faq-outline";
import { listFaqRegistry } from "./faqs";

describe("listFaqRegistry", () => {
  it("lists exactly the code-defined FAQ items, grouped and ordered as src/components/faq/faq-outline.ts defines", async () => {
    const rows = await listFaqRegistry();
    const expectedIds = FAQ_GROUPS.flatMap((group) => group.items);

    expect(rows.map((row) => row.itemId)).toEqual(expectedIds);
  });

  it("carries the group label and the question text from the faq namespace", async () => {
    const rows = await listFaqRegistry();
    const row = rows.find((row) => row.itemId === "registered");

    expect(row?.groupId).toBe("company");
    expect(row?.groupLabel).toBe("Company and registration");
    expect(row?.question).toBe("Is the company registered?");
  });

  it("links to the public FAQ page with the question's id as the anchor, per locale", async () => {
    const rows = await listFaqRegistry();
    const row = rows.find((row) => row.itemId === "prices");

    expect(row?.publicPaths).toEqual({
      en: "/en/faq#prices",
      zh: "/zh/faq#prices",
      ar: "/ar/faq#prices",
    });
  });
});
