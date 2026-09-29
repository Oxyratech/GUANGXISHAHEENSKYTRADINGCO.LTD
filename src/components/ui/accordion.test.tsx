import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion";

function Faq(props: { headingLevel?: 2 | 3 | 4 }) {
  return (
    <Accordion type="single" collapsible>
      {["One", "Two", "Three"].map((name) => (
        <AccordionItem key={name} value={name}>
          <AccordionTrigger headingLevel={props.headingLevel}>Question {name}</AccordionTrigger>
          <AccordionContent>Answer {name}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

describe("Accordion", () => {
  it("starts collapsed and toggles with Enter and Space", async () => {
    const user = userEvent.setup();
    render(<Faq />);
    const first = screen.getByRole("button", { name: "Question One" });
    expect(first).toHaveAttribute("aria-expanded", "false");

    await user.tab();
    expect(first).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("region", { name: "Question One" })).toHaveTextContent("Answer One");

    await user.keyboard(" ");
    expect(first).toHaveAttribute("aria-expanded", "false");
  });

  it("moves between triggers with the arrow keys, Home and End", async () => {
    const user = userEvent.setup();
    render(<Faq />);
    await user.tab();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: "Question Two" })).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("button", { name: "Question Three" })).toHaveFocus();
    await user.keyboard("{ArrowUp}{Home}");
    expect(screen.getByRole("button", { name: "Question One" })).toHaveFocus();
  });

  it("keeps one item open at a time in single mode", async () => {
    const user = userEvent.setup();
    render(<Faq />);
    await user.click(screen.getByRole("button", { name: "Question One" }));
    await user.click(screen.getByRole("button", { name: "Question Two" }));
    expect(screen.getByRole("button", { name: "Question One" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByRole("button", { name: "Question Two" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("wraps each trigger in a heading of the requested level", () => {
    const { unmount } = render(<Faq />);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
    unmount();
    render(<Faq headingLevel={2} />);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(3);
  });
});
