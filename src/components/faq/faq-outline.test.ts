import enFaq from "@/messages/en/faq.json";
import { FAQ_GROUPS, faqGroupAnchor } from "./faq-outline";

const outlineItems = FAQ_GROUPS.flatMap((group) => group.items);

describe("FAQ outline", () => {
  it("lists the four groups of the brief, in order", () => {
    expect(FAQ_GROUPS.map((group) => group.id)).toEqual([
      "company",
      "products",
      "inquiries",
      "shipping",
    ]);
    expect(FAQ_GROUPS.map((group) => group.id)).toEqual(Object.keys(enFaq.groups));
  });

  it("places every message exactly once", () => {
    expect([...outlineItems].sort()).toEqual(Object.keys(enFaq.items).sort());
    expect(new Set(outlineItems).size).toBe(outlineItems.length);
  });

  it("asks a sensible number of questions", () => {
    expect(outlineItems.length).toBeGreaterThanOrEqual(12);
    expect(outlineItems.length).toBeLessThanOrEqual(16);
  });

  it("covers every question the brief requires", () => {
    expect(outlineItems).toEqual(
      expect.arrayContaining([
        "sourcing",
        "submit",
        "location",
        "contact",
        "categories",
        "registered",
        "languages",
        "prices",
        "include",
        "attachments",
        "process",
        "documentation",
        "regulated",
      ]),
    );
  });

  it("never lets a group anchor collide with a question id", () => {
    const anchors = FAQ_GROUPS.map((group) => faqGroupAnchor(group.id));
    expect(anchors.filter((anchor) => outlineItems.some((id) => id === anchor))).toEqual([]);
    expect(new Set(anchors).size).toBe(anchors.length);
  });
});
