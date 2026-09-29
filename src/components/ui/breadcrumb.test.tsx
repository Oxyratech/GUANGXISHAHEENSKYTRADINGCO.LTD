import { render, screen, within } from "@testing-library/react";
import { Breadcrumb } from "./breadcrumb";

vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);

const ITEMS = [
  { label: "Home", href: "/" },
  { label: "Business", href: "/business" },
  { label: "Import & export" },
];

describe("Breadcrumb", () => {
  it("is a labelled nav wrapping an ordered list with one item per crumb", () => {
    render(<Breadcrumb label="You are here" items={ITEMS} />);
    const nav = screen.getByRole("navigation", { name: "You are here" });
    expect(within(nav).getByRole("list").tagName).toBe("OL");
    expect(within(nav).getAllByRole("listitem")).toHaveLength(3);
  });

  it("marks the last item as the current page and does not link it", () => {
    render(<Breadcrumb label="You are here" items={ITEMS} />);
    const current = screen.getByText("Import & export");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current.closest("a")).toBeNull();
    expect(screen.getAllByRole("link").map((a) => a.textContent)).toEqual(["Home", "Business"]);
  });

  it("does not link the last item even when it has an href", () => {
    render(
      <Breadcrumb
        label="Trail"
        items={[
          { label: "Home", href: "/" },
          { label: "Now", href: "/now" },
        ]}
      />,
    );
    expect(screen.getByText("Now")).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("uses locale-aware links", () => {
    render(<Breadcrumb label="Trail" items={ITEMS} />);
    expect(screen.getByRole("link", { name: "Business" })).toHaveAttribute("href", "/en/business");
  });

  it("hides mirrored chevron separators from assistive tech", () => {
    const { container } = render(<Breadcrumb label="Trail" items={ITEMS} />);
    const separators = container.querySelectorAll("svg");
    expect(separators).toHaveLength(2);
    separators.forEach((svg) => {
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveClass("rtl-flip");
    });
  });
});
