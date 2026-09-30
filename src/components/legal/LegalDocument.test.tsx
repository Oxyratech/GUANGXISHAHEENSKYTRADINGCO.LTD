import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LegalDocument, type LegalDocumentProps } from "./LegalDocument";

const SECTIONS = [
  { id: "controller", title: "Who is responsible", content: <p>The company decides.</p> },
  { id: "acceptable-use", title: "Acceptable use", content: <p>Do not misuse.</p> },
  { id: "contact", title: "Contact", content: <p>Use the form.</p> },
];

function renderDocument(overrides: Partial<LegalDocumentProps> = {}) {
  return render(
    <LegalDocument
      sections={SECTIONS}
      review={{ title: "Legal review status", body: "A general draft, not reviewed by counsel." }}
      updated={
        <>
          Last updated: <time dateTime="2026-09-30">30 September 2026</time>
        </>
      }
      tocTitle="On this page"
      printLabel="Print this page"
      {...overrides}
    />,
  );
}

describe("LegalDocument", () => {
  it("opens with the review status notice, before any of the text", () => {
    const { container } = renderDocument();
    const notice = screen.getByRole("note");

    expect(notice).toHaveTextContent("Legal review status");
    expect(notice).toHaveTextContent("A general draft, not reviewed by counsel.");
    const firstSection = container.querySelector("section");
    expect(
      notice.compareDocumentPosition(firstSection as Node) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // A static notice must not interrupt a screen reader like an error does.
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows when the document was last updated, as a machine-readable date", () => {
    renderDocument();
    const time = screen.getByText("30 September 2026");
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("datetime", "2026-09-30");
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
  });

  it("renders each section under an h2 with an id, and the page keeps a single h1 for the hero", () => {
    renderDocument();
    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.map((h) => [h.id, h.textContent])).toEqual([
      ["controller", "Who is responsible"],
      ["acceptable-use", "Acceptable use"],
      ["contact", "Contact"],
    ]);
    expect(screen.queryAllByRole("heading", { level: 1 })).toHaveLength(0);
  });

  it("builds a table of contents whose every link resolves to a section heading", () => {
    const { container } = renderDocument();
    const toc = screen.getByRole("navigation", { name: "On this page" });
    const links = within(toc).getAllByRole("link");

    expect(links.map((link) => link.textContent)).toEqual(SECTIONS.map((s) => s.title));
    for (const link of links) {
      const id = link.getAttribute("href")?.slice(1) ?? "";
      const target = container.ownerDocument.getElementById(id);
      expect(target, id).not.toBeNull();
      expect(target?.tagName).toBe("H2");
      expect(target).toHaveTextContent(link.textContent ?? "");
    }
  });

  it("marks the document for the print stylesheet and keeps navigation and print button off paper", () => {
    const { container } = renderDocument();
    expect(container.querySelector("[data-legal-document]")).not.toBeNull();
    expect(screen.getByRole("navigation", { name: "On this page" })).toHaveClass("print:hidden");
    expect(screen.getByRole("button", { name: "Print this page" })).toHaveClass("print:hidden");
  });

  it("prints when the print button is used", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    renderDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Print this page" }));
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("uses logical spacing only, so Arabic mirrors correctly", () => {
    const { container } = renderDocument();
    expect(container.innerHTML).not.toMatch(/\b(?:ml|mr|pl|pr|left|right)-\d|text-(?:left|right)/);
  });
});
