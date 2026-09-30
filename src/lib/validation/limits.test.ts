// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FIELD_LIMITS } from "./limits";

const schema = readFileSync(
  fileURLToPath(new URL("../../../prisma/schema.prisma", import.meta.url)),
  "utf8",
);

/** The NVarChar width of `field` in `model`, read from the Prisma schema. */
function columnWidth(model: string, field: string): number {
  const block = new RegExp(`^model ${model} \\{([\\s\\S]*?)^\\}`, "m").exec(schema)?.[1];
  if (!block) throw new Error(`model ${model} not found in schema.prisma`);
  const line = new RegExp(`^\\s+${field}\\s+.*@db\\.NVarChar\\((\\d+)\\)`, "m").exec(block);
  if (!line) throw new Error(`${model}.${field} has no NVarChar width`);
  return Number(line[1]);
}

describe("FIELD_LIMITS", () => {
  it.each([
    ["name", "BusinessInquiry", "name"],
    ["company", "BusinessInquiry", "company"],
    ["email", "BusinessInquiry", "email"],
    ["phone", "BusinessInquiry", "phone"],
    ["phone", "BusinessInquiry", "whatsapp"],
    ["product", "BusinessInquiry", "productName"],
    ["quantity", "BusinessInquiry", "quantity"],
    ["specification", "BusinessInquiry", "specification"],
    ["targetPrice", "BusinessInquiry", "targetPrice"],
    ["additionalRequirements", "BusinessInquiry", "additionalRequirements"],
    ["productSlug", "Product", "slug"],
    ["name", "ContactMessage", "name"],
    ["company", "ContactMessage", "company"],
    ["email", "ContactMessage", "email"],
    ["phone", "ContactMessage", "phone"],
    ["message", "ContactMessage", "message"],
  ] as const)("%s is as wide as %s.%s", (limit, model, column) => {
    expect(FIELD_LIMITS[limit].max).toBe(columnWidth(model, column));
  });

  it("leaves room in the database for a reference code", () => {
    // "INQ-" or "MSG-" plus 8 characters.
    expect(columnWidth("BusinessInquiry", "referenceCode")).toBeGreaterThanOrEqual(12);
    expect(columnWidth("ContactMessage", "referenceCode")).toBeGreaterThanOrEqual(12);
  });

  it("stores country codes and the category slug in columns that hold them", () => {
    expect(columnWidth("BusinessInquiry", "country")).toBeGreaterThanOrEqual(2);
    expect(columnWidth("BusinessInquiry", "destinationCountry")).toBeGreaterThanOrEqual(2);
    expect(columnWidth("ContactMessage", "country")).toBeGreaterThanOrEqual(2);
    // The longest category slug is "medical-protective-supplies" (27).
    expect(columnWidth("BusinessInquiry", "categorySlug")).toBeGreaterThanOrEqual(27);
  });
});
