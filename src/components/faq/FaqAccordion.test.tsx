import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FaqAccordion, type FaqGroupView } from "./FaqAccordion";

const GROUPS: FaqGroupView[] = [
  {
    id: "company",
    anchorId: "group-company",
    title: "Company",
    items: [
      { id: "registered", question: "Is it registered?", answer: "Yes, see below." },
      { id: "location", question: "Where is it?", answer: <a href="#details">Company page</a> },
    ],
  },
  {
    id: "inquiries",
    anchorId: "group-inquiries",
    title: "Inquiries",
    items: [{ id: "prices", question: "Are prices listed?", answer: "No prices are published." }],
  },
];

const trigger = (name: string) => screen.getByRole("button", { name });

function setHash(hash: string) {
  window.history.replaceState(null, "", `/faq${hash}`);
}

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("FaqAccordion", () => {
  it("renders every group as a section named by its h2, with every question as an h3 button", () => {
    render(<FaqAccordion groups={GROUPS} />);

    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Company",
      "Inquiries",
    ]);
    expect(screen.getByRole("region", { name: "Company" })).toHaveAttribute("id", "group-company");
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
    for (const name of ["Is it registered?", "Where is it?", "Are prices listed?"]) {
      expect(trigger(name)).toHaveAttribute("aria-expanded", "false");
    }
  });

  it("gives every question its id, so a link can point at it", () => {
    const { container } = render(<FaqAccordion groups={GROUPS} />);
    for (const id of ["registered", "location", "prices"]) {
      expect(container.querySelector(`#${id}`)).not.toBeNull();
    }
  });

  it("shows an answer only while its question is open", async () => {
    const user = userEvent.setup();
    render(<FaqAccordion groups={GROUPS} />);
    expect(screen.queryByText("No prices are published.")).toBeNull();

    await user.click(trigger("Are prices listed?"));
    expect(screen.getByText("No prices are published.")).toBeVisible();

    await user.click(trigger("Are prices listed?"));
    expect(screen.queryByText("No prices are published.")).toBeNull();
  });

  it("opens and closes a question with Enter and Space", async () => {
    const user = userEvent.setup();
    render(<FaqAccordion groups={GROUPS} />);
    const first = trigger("Is it registered?");

    await user.tab();
    expect(first).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Yes, see below.")).toBeVisible();

    await user.keyboard(" ");
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Yes, see below.")).toBeNull();
  });

  it("moves through the questions of all groups with the arrow keys, Home and End", async () => {
    const user = userEvent.setup();
    render(<FaqAccordion groups={GROUPS} />);
    await user.tab();

    await user.keyboard("{ArrowDown}");
    expect(trigger("Where is it?")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(trigger("Are prices listed?")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(trigger("Is it registered?")).toHaveFocus();
    await user.keyboard("{End}");
    expect(trigger("Are prices listed?")).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(trigger("Where is it?")).toHaveFocus();
  });

  it("keeps one answer open at a time, across groups", async () => {
    const user = userEvent.setup();
    render(<FaqAccordion groups={GROUPS} />);
    await user.click(trigger("Is it registered?"));
    await user.click(trigger("Are prices listed?"));
    expect(trigger("Is it registered?")).toHaveAttribute("aria-expanded", "false");
    expect(trigger("Are prices listed?")).toHaveAttribute("aria-expanded", "true");
  });

  it("names the open question in the address bar and clears it on close", async () => {
    const user = userEvent.setup();
    render(<FaqAccordion groups={GROUPS} />);

    await user.click(trigger("Are prices listed?"));
    expect(window.location.hash).toBe("#prices");

    await user.click(trigger("Are prices listed?"));
    expect(window.location.hash).toBe("");
  });

  it("opens the question named by the address when the page loads", () => {
    setHash("#prices");
    render(<FaqAccordion groups={GROUPS} />);
    expect(trigger("Are prices listed?")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("No prices are published.")).toBeVisible();
    expect(trigger("Is it registered?")).toHaveAttribute("aria-expanded", "false");
  });

  it("opens another question when the link is followed while the page is open", () => {
    render(<FaqAccordion groups={GROUPS} />);
    expect(trigger("Where is it?")).toHaveAttribute("aria-expanded", "false");

    act(() => {
      setHash("#location");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(trigger("Where is it?")).toHaveAttribute("aria-expanded", "true");
  });

  it("leaves the open question alone when a group link changes the fragment", async () => {
    const user = userEvent.setup();
    render(<FaqAccordion groups={GROUPS} />);
    await user.click(trigger("Is it registered?"));

    act(() => {
      setHash("#group-inquiries");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(trigger("Is it registered?")).toHaveAttribute("aria-expanded", "true");
  });

  it("ignores a fragment that names no question", () => {
    setHash("#nonexistent");
    render(<FaqAccordion groups={GROUPS} />);
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAttribute("aria-expanded", "false");
    }
  });

  it("renders rich answers, such as links, inside the answer", async () => {
    const user = userEvent.setup();
    render(<FaqAccordion groups={GROUPS} />);
    await user.click(trigger("Where is it?"));
    const region = screen.getByRole("region", { name: "Where is it?" });
    expect(within(region).getByRole("link", { name: "Company page" })).toHaveAttribute(
      "href",
      "#details",
    );
  });
});
