// @vitest-environment node
import { describe, expect, it } from "vitest";
import { SERVICES } from "@/content/services";
import { listServiceRegistry } from "./services";

describe("listServiceRegistry", () => {
  it("lists exactly the 6 code-defined services, in their defined order", async () => {
    const rows = await listServiceRegistry();
    expect(rows).toHaveLength(SERVICES.length);
    expect(rows.map((row) => row.slug)).toEqual(SERVICES.map((s) => s.slug));
  });

  it("carries the English name from the services namespace", async () => {
    const rows = await listServiceRegistry();
    expect(rows.find((row) => row.slug === "import-export")?.name).toBe("Import & Export");
  });

  it("resolves each service's related scope items to their verbatim license text", async () => {
    const rows = await listServiceRegistry();
    const row = rows.find((row) => row.slug === "international-trading");
    expect(row?.relatedScopeItemsZh.length).toBeGreaterThan(0);
    expect(row?.relatedScopeItemsZh).toContain("货物进出口");
  });

  it("builds a public page path for every locale", async () => {
    const rows = await listServiceRegistry();
    const row = rows[0];
    expect(row.publicPaths).toEqual({
      en: `/en/business/${row.slug}`,
      zh: `/zh/business/${row.slug}`,
      ar: `/ar/business/${row.slug}`,
    });
  });
});
