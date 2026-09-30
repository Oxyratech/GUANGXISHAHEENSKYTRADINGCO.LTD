// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * InquiryNote holds internal staff notes (prisma/schema.prisma marks it "Internal only — never
 * selected by any public query"). This scans the public inquiries submission module — owned and
 * edited independently by another part of the codebase — for any reference to it, so a future change
 * there cannot silently start leaking notes to a buyer-facing query.
 */
const PUBLIC_INQUIRIES_DIR = join(import.meta.dirname, "..", "..", "inquiries");

describe("internal notes stay out of the public inquiries code", () => {
  it("finds no mention of InquiryNote in src/server/inquiries", () => {
    const files = readdirSync(PUBLIC_INQUIRIES_DIR).filter(
      (name) => name.endsWith(".ts") && !name.endsWith(".test.ts"),
    );
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const text = readFileSync(join(PUBLIC_INQUIRIES_DIR, file), "utf8");
      expect(text).not.toMatch(/inquiryNote|InquiryNote/);
    }
  });
});
