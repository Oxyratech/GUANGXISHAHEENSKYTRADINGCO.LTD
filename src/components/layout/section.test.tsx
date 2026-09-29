import { render, screen } from "@testing-library/react";
import { Section } from "./section";
import { SectionHeading } from "./section-heading";

describe("Section", () => {
  it("applies the vertical rhythm and does not add a Container", () => {
    render(<Section data-testid="s">content</Section>);
    const section = screen.getByTestId("s");
    expect(section.tagName).toBe("SECTION");
    expect(section).toHaveClass("py-16", "md:py-24", "bg-white");
    expect(section.firstElementChild).toBeNull();
  });

  it.each([
    ["default", "bg-white", "default"],
    ["muted", "bg-surface", "muted"],
    ["navy", "bg-navy-900", "navy"],
  ] as const)("tone %s", (tone, background, dataTone) => {
    render(<Section tone={tone} data-testid="s" />);
    expect(screen.getByTestId("s")).toHaveClass(background);
    expect(screen.getByTestId("s")).toHaveAttribute("data-tone", dataTone);
  });

  it("uses light text on navy", () => {
    render(<Section tone="navy" data-testid="s" />);
    expect(screen.getByTestId("s")).toHaveClass("text-white");
  });

  it("becomes a named region when labelled by its heading", () => {
    render(
      <Section aria-labelledby="scope-title" id="scope">
        <SectionHeading id="scope-title" title="Registered scope" />
      </Section>,
    );
    expect(screen.getByRole("region", { name: "Registered scope" })).toHaveAttribute("id", "scope");
  });

  it("offers a compact spacing", () => {
    render(<Section spacing="compact" data-testid="s" />);
    expect(screen.getByTestId("s")).toHaveClass("py-10", "md:py-14");
    expect(screen.getByTestId("s")).not.toHaveClass("py-16");
  });
});

describe("SectionHeading", () => {
  it("renders eyebrow, title (h2) and description", () => {
    render(
      <SectionHeading eyebrow="Services" title="What we do" description="Six areas of work." />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "What we do" })).toBeInTheDocument();
    expect(screen.getByText("Services")).toBeInTheDocument();
    expect(screen.getByText("Six areas of work.")).toBeInTheDocument();
  });

  it("supports other heading levels", () => {
    render(<SectionHeading as="h3" title="Sub-section" />);
    expect(screen.getByRole("heading", { level: 3, name: "Sub-section" })).toBeInTheDocument();
  });

  it("aligns to the start by default and centres on request", () => {
    const { container, rerender } = render(<SectionHeading title="T" />);
    expect(container.firstElementChild).not.toHaveClass("text-center");
    rerender(<SectionHeading title="T" align="center" />);
    expect(container.firstElementChild).toHaveClass("text-center", "mx-auto");
  });

  it("omits optional parts that are not given", () => {
    const { container } = render(<SectionHeading title="Only title" />);
    expect(container.querySelectorAll("p")).toHaveLength(0);
  });

  it("gives the gold rule to the eyebrow as decoration only", () => {
    const { container } = render(<SectionHeading eyebrow="Label" title="T" />);
    expect(container.querySelector("span[aria-hidden='true']")).toBeInTheDocument();
  });
});
