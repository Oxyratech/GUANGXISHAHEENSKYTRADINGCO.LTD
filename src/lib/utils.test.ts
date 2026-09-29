import { cn } from "./utils";

describe("cn", () => {
  it("keeps a type-scale utility next to a text colour", () => {
    expect(cn("text-h3 text-ink-muted")).toBe("text-h3 text-ink-muted");
    expect(cn("text-white", "text-button")).toBe("text-white text-button");
  });

  it("lets a later type-scale utility override an earlier one", () => {
    expect(cn("text-body text-small")).toBe("text-small");
    expect(cn("text-h3", false, "text-h2")).toBe("text-h2");
  });

  it("still resolves ordinary Tailwind conflicts and colour overrides", () => {
    expect(cn("h-11 h-auto")).toBe("h-auto");
    expect(cn("text-white text-navy-900")).toBe("text-navy-900");
    expect(cn("px-4", "px-6", undefined)).toBe("px-6");
  });
});
