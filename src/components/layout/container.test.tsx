import { render, screen } from "@testing-library/react";
import { Container } from "./container";

describe("Container", () => {
  it("centres content with the responsive gutters and a 1240px cap by default", () => {
    render(<Container data-testid="c">x</Container>);
    expect(screen.getByTestId("c")).toHaveClass(
      "mx-auto",
      "w-full",
      "px-4",
      "sm:px-6",
      "lg:px-8",
      "max-w-[1240px]",
    );
  });

  it("supports narrow and wide sizes", () => {
    render(
      <>
        <Container size="narrow" data-testid="narrow" />
        <Container size="wide" data-testid="wide" />
      </>,
    );
    expect(screen.getByTestId("narrow")).toHaveClass("max-w-3xl");
    expect(screen.getByTestId("narrow")).not.toHaveClass("max-w-[1240px]");
    expect(screen.getByTestId("wide")).toHaveClass("max-w-[1440px]");
  });

  it("can render another element and merges className", () => {
    render(
      <Container as="main" id="main" className="pt-8" data-testid="c">
        x
      </Container>,
    );
    const container = screen.getByTestId("c");
    expect(container.tagName).toBe("MAIN");
    expect(container).toHaveAttribute("id", "main");
    expect(container).toHaveClass("pt-8", "px-4");
  });
});
