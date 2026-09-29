import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button, buttonVariants } from "./button";

describe("Button", () => {
  it("is type=button by default so it never submits a form by accident", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "button");
  });

  it("applies variant and size classes, letting className override them", () => {
    render(
      <Button variant="secondary" size="lg" className="h-20">
        Go
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Go" });
    expect(button).toHaveClass("bg-blue-600", "text-white", "h-20", "px-8");
    expect(button).not.toHaveClass("h-13");
  });

  it("keeps type-scale and colour classes together (text-button + text-white)", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button")).toHaveClass("text-button", "text-white");
  });

  it("offers light variants for navy bands", () => {
    render(
      <>
        <Button variant="inverse">Solid</Button>
        <Button variant="outline-inverse">Outline</Button>
      </>,
    );
    expect(screen.getByRole("button", { name: "Solid" })).toHaveClass("bg-white", "text-navy-900");
    expect(screen.getByRole("button", { name: "Outline" })).toHaveClass(
      "border-white/40",
      "text-white",
    );
  });

  it("sizes the link variant to its text", () => {
    render(<Button variant="link">Read more</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("h-auto", "px-0");
    expect(button).not.toHaveClass("h-11");
  });

  it("renders its child with the button styles when asChild is set", () => {
    render(
      <Button asChild variant="outline">
        <a href="https://example.com/contact">Contact</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Contact" });
    expect(link).toHaveAttribute("href", "https://example.com/contact");
    expect(link).toHaveClass("border", "text-navy-900");
    expect(link).not.toHaveAttribute("type");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("calls onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  describe("loading", () => {
    it("announces busy state, shows a spinner and swallows clicks but stays focusable", async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();
      render(
        <Button loading onClick={onClick}>
          Send
        </Button>,
      );
      const button = screen.getByRole("button", { name: "Send" });
      expect(button).toHaveAttribute("aria-busy", "true");
      expect(button).toHaveAttribute("aria-disabled", "true");
      expect(button).not.toBeDisabled();
      expect(button.querySelector("svg")).toBeInTheDocument();

      await user.tab();
      expect(button).toHaveFocus();
      await user.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });

    it("does not submit the surrounding form while loading", async () => {
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
      render(
        <form onSubmit={onSubmit}>
          <Button type="submit" loading>
            Send
          </Button>
        </form>,
      );
      await userEvent.click(screen.getByRole("button"));
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("sets no busy attributes when idle", () => {
      render(<Button>Send</Button>);
      const button = screen.getByRole("button");
      expect(button).not.toHaveAttribute("aria-busy");
      expect(button).not.toHaveAttribute("aria-disabled");
    });
  });

  it("supports the native disabled attribute", () => {
    render(<Button disabled>Nope</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});

describe("buttonVariants", () => {
  it("returns merged classes usable on any element", () => {
    const classes = buttonVariants({ variant: "gold", size: "icon", className: "rounded-lg" });
    expect(classes).toContain("bg-gold-400");
    expect(classes).toContain("size-11");
    expect(classes).toContain("rounded-lg");
    expect(classes).not.toContain("rounded-md");
  });

  it("defaults to the primary navy button", () => {
    expect(buttonVariants()).toContain("bg-navy-900");
  });
});
