import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import { Skeleton } from "./skeleton";
import { Spinner } from "./spinner";
import { VisuallyHidden } from "./visually-hidden";
import { Separator } from "./separator";

describe("EmptyState", () => {
  it("shows title, description and action, with a decorative icon", () => {
    const { container } = render(
      <EmptyState
        icon={<svg data-testid="icon" />}
        title="No products published yet"
        description="Our catalogue is being prepared."
        action={<a href="#inquiry">Send an inquiry</a>}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 3, name: "No products published yet" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Our catalogue is being prepared.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Send an inquiry" })).toBeInTheDocument();
    expect(screen.getByTestId("icon").parentElement).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("[role='alert']")).toBeNull();
  });

  it("lets the heading level be chosen", () => {
    render(<EmptyState title="Nothing" titleAs="h2" />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });
});

describe("ErrorState", () => {
  it("is an alert with title, description and a retry action", () => {
    render(
      <ErrorState
        title="Something went wrong"
        description="Please try again."
        action={<button type="button">Try again</button>}
      />,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong");
    expect(alert).toHaveTextContent("Please try again.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("shows the reference id with its translated label", () => {
    render(<ErrorState title="Error" referenceLabel="Reference" referenceId="A1B2C3" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Reference: A1B2C3");
    expect(screen.getByText("A1B2C3").tagName).toBe("BDI");
  });

  it("omits the reference line when there is no id", () => {
    render(<ErrorState title="Error" />);
    expect(screen.queryByText(/Reference/)).not.toBeInTheDocument();
  });
});

describe("Spinner", () => {
  it("is decorative without a label", () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("announces itself as a status when labelled", () => {
    render(<Spinner label="Loading products" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading products");
  });

  it("only rotates when motion is allowed", () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector("svg")).toHaveClass("motion-safe:animate-spin");
  });
});

describe("Skeleton", () => {
  it("is hidden from assistive tech and not animated", () => {
    render(<Skeleton data-testid="sk" className="h-4 w-24" />);
    const skeleton = screen.getByTestId("sk");
    expect(skeleton).toHaveAttribute("aria-hidden", "true");
    expect(skeleton.className).not.toMatch(/animate-/);
  });
});

describe("VisuallyHidden", () => {
  it("keeps text available to screen readers but off screen", () => {
    render(<VisuallyHidden>Opens in a new tab</VisuallyHidden>);
    expect(screen.getByText("Opens in a new tab")).toHaveClass("sr-only");
  });

  it("can render another element", () => {
    render(<VisuallyHidden as="h2">Filters</VisuallyHidden>);
    expect(screen.getByRole("heading", { level: 2, name: "Filters" })).toHaveClass("sr-only");
  });
});

describe("Badge", () => {
  it("renders text in the chosen variant", () => {
    render(<Badge variant="gold">Compliance note</Badge>);
    expect(screen.getByText("Compliance note")).toHaveClass("bg-gold-50", "text-gold-700");
  });

  it("defaults to neutral", () => {
    render(<Badge>Draft</Badge>);
    expect(screen.getByText("Draft")).toHaveClass("bg-surface");
  });
});

describe("Separator", () => {
  it("is decorative by default and can be exposed as a separator", () => {
    const { rerender } = render(<Separator data-testid="sep" />);
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
    rerender(<Separator decorative={false} orientation="vertical" />);
    expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "vertical");
  });
});
