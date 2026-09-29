import { render, screen } from "@testing-library/react";
import { Alert } from "./alert";

describe("Alert", () => {
  it.each(["danger", "warning"] as const)("%s uses role=alert", (variant) => {
    render(<Alert variant={variant} title="Heads up" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Heads up");
  });

  it.each(["info", "success"] as const)("%s uses role=status", (variant) => {
    render(<Alert variant={variant} title="FYI" />);
    expect(screen.getByRole("status")).toHaveTextContent("FYI");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("defaults to info", () => {
    render(<Alert>Plain message</Alert>);
    expect(screen.getByRole("status")).toHaveTextContent("Plain message");
  });

  it("renders title and body and hides the decorative icon", () => {
    const { container } = render(
      <Alert variant="warning" title="Regulated goods">
        Additional licences may apply.
      </Alert>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Regulated goods");
    expect(screen.getByRole("alert")).toHaveTextContent("Additional licences may apply.");
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
