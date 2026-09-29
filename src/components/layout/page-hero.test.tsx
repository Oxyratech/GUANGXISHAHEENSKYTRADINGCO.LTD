import { render, screen } from "@testing-library/react";
import { PageHero } from "./page-hero";

describe("PageHero", () => {
  it("renders the page's single h1 with eyebrow and description", () => {
    render(
      <PageHero eyebrow="About" title="Company profile" description="Registered in Guangxi." />,
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Company profile" })).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.getByText("Registered in Guangxi.")).toBeInTheDocument();
  });

  it("exposes the h1 id", () => {
    render(<PageHero title="Contact" id="page-title" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveAttribute("id", "page-title");
  });

  it("places the breadcrumb, actions and aside slots", () => {
    render(
      <PageHero
        title="Business"
        breadcrumb={<nav aria-label="Trail">trail</nav>}
        actions={<a href="#inquiry">Send an inquiry</a>}
        aside={<aside aria-label="Key facts">facts</aside>}
      />,
    );
    expect(screen.getByRole("navigation", { name: "Trail" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Send an inquiry" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Key facts" })).toBeInTheDocument();
  });

  it("lays out two columns from lg only when there is an aside", () => {
    const layout = () => screen.getByRole("heading", { level: 1 }).parentElement?.parentElement;
    const { rerender } = render(<PageHero title="A" />);
    expect(layout()?.className).not.toContain("lg:grid-cols-");
    rerender(<PageHero title="A" aside={<p>x</p>} />);
    expect(layout()?.className).toContain("lg:grid-cols-");
  });

  it("varies by tone", () => {
    const { container, rerender } = render(<PageHero title="A" />);
    expect(container.firstElementChild).toHaveAttribute("data-tone", "light");
    expect(container.firstElementChild).toHaveClass("bg-surface");
    rerender(<PageHero title="A" tone="navy" />);
    expect(container.firstElementChild).toHaveAttribute("data-tone", "navy");
    expect(container.firstElementChild).toHaveClass("bg-navy-900", "text-white");
  });

  it("varies by size: expanded has a larger title and more padding than compact", () => {
    const { container, rerender } = render(<PageHero title="A" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveClass("text-h2");
    expect(container.querySelector(".py-10")).not.toBeNull();
    rerender(<PageHero title="A" size="expanded" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveClass("text-h1");
    expect(container.querySelector(".py-16")).not.toBeNull();
  });
});
