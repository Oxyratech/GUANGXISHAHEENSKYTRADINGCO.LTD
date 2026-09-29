import { render, screen } from "@testing-library/react";
import { Prose } from "./prose";

describe("Prose", () => {
  it("renders arbitrary content with a ~68ch measure", () => {
    render(
      <Prose data-testid="p">
        <h2>Terms of use</h2>
        <p>Body text.</p>
        <ul>
          <li>One</li>
          <li>Two</li>
        </ul>
      </Prose>,
    );
    const prose = screen.getByTestId("p");
    expect(prose).toHaveClass("max-w-[68ch]");
    expect(screen.getByRole("heading", { level: 2, name: "Terms of use" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("styles lists and quotes with logical inline-start spacing so they work in RTL", () => {
    render(<Prose data-testid="p" />);
    const classes = screen.getByTestId("p").className;
    expect(classes).toContain("[&_ul]:ps-6");
    expect(classes).toContain("[&_blockquote]:border-s-2");
    expect(classes).not.toMatch(/(?:^|\s)\S*(?:-|:)(?:pl|pr|ml|mr)-\d/);
    expect(classes).not.toMatch(/border-[lr]\b/);
  });

  it("keeps the type-scale heading style next to its colour", () => {
    render(<Prose data-testid="p" />);
    const classes = screen.getByTestId("p").className;
    expect(classes).toContain("[&_h2]:text-h3");
    expect(classes).toContain("[&_h2]:text-navy-900");
  });

  it("can render as an article and merge a class", () => {
    render(<Prose as="article" className="mx-auto" data-testid="p" />);
    expect(screen.getByTestId("p").tagName).toBe("ARTICLE");
    expect(screen.getByTestId("p")).toHaveClass("mx-auto", "max-w-[68ch]");
  });
});
