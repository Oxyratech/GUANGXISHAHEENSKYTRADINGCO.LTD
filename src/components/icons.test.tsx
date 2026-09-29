import { render, screen } from "@testing-library/react";
import { CATEGORIES, type IconName } from "@/content/categories";
import { DirectionalIcon, Icon, Menu, X } from "./icons";

// Exhaustive by construction: adding a name to the IconName union without listing it here fails tsc.
const ALL_ICON_NAMES = Object.keys({
  Gift: 1,
  Shirt: 1,
  Wheat: 1,
  House: 1,
  Blocks: 1,
  PaintRoller: 1,
  Wrench: 1,
  Cable: 1,
  Cog: 1,
  Layers: 1,
  Mountain: 1,
  ShieldPlus: 1,
  Ship: 1,
  Globe: 1,
  PackageSearch: 1,
  Handshake: 1,
  ClipboardList: 1,
  ArrowLeftRight: 1,
} satisfies Record<IconName, 1>) as IconName[];

describe("Icon", () => {
  it.each(ALL_ICON_NAMES)("renders %s as an svg", (name) => {
    const { container } = render(<Icon name={name} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders every icon the category registry uses", () => {
    for (const category of CATEGORIES) {
      const { container, unmount } = render(<Icon name={category.icon} />);
      expect(container.querySelector("svg")).toBeInTheDocument();
      unmount();
    }
  });

  it("is decorative by default", () => {
    const { container } = render(<Icon name="Gift" />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("becomes an accessible image when labelled", () => {
    render(<Icon name="Ship" label="Sea freight" />);
    const icon = screen.getByRole("img", { name: "Sea freight" });
    expect(icon).not.toHaveAttribute("aria-hidden");
  });

  it("accepts size and class name", () => {
    const { container } = render(<Icon name="Cog" size={32} className="text-blue-600" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "32");
    expect(svg).toHaveClass("text-blue-600");
  });
});

describe("DirectionalIcon", () => {
  it("mirrors in RTL through the rtl-flip class and is decorative", () => {
    const { container } = render(<DirectionalIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("rtl-flip");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveClass("lucide-arrow-right");
  });

  it.each([
    ["arrow", "forward", "lucide-arrow-right"],
    ["arrow", "back", "lucide-arrow-left"],
    ["chevron", "forward", "lucide-chevron-right"],
    ["chevron", "back", "lucide-chevron-left"],
  ] as const)("%s %s", (kind, direction, iconClass) => {
    const { container } = render(<DirectionalIcon kind={kind} direction={direction} />);
    expect(container.querySelector("svg")).toHaveClass(iconClass, "rtl-flip");
  });

  it("keeps extra classes", () => {
    const { container } = render(<DirectionalIcon className="size-4" />);
    expect(container.querySelector("svg")).toHaveClass("size-4", "rtl-flip");
  });
});

describe("re-exports", () => {
  it("exposes the shared icons", () => {
    expect(Menu).toBeDefined();
    expect(X).toBeDefined();
  });
});
