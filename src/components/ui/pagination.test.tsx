import { render, screen, within } from "@testing-library/react";
import { Pagination } from "./pagination";
import { getPaginationRange } from "./pagination-range";

vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);

function renderPagination(page: number, pageCount: number) {
  return render(
    <Pagination
      page={page}
      pageCount={pageCount}
      getHref={(p) => `/news?page=${p}`}
      label="News pages"
      previousLabel="Previous"
      nextLabel="Next"
      getPageLabel={(p) => `Page ${p}`}
    />,
  );
}

describe("getPaginationRange", () => {
  it("lists every page when there are few", () => {
    expect(getPaginationRange(2, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPaginationRange(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("collapses the far side near the start and the end", () => {
    expect(getPaginationRange(1, 10)).toEqual([1, 2, 3, 4, 5, "gap", 10]);
    expect(getPaginationRange(4, 10)).toEqual([1, 2, 3, 4, 5, "gap", 10]);
    expect(getPaginationRange(10, 10)).toEqual([1, "gap", 6, 7, 8, 9, 10]);
  });

  it("collapses both sides in the middle", () => {
    expect(getPaginationRange(5, 10)).toEqual([1, "gap", 4, 5, 6, "gap", 10]);
    expect(getPaginationRange(6, 20)).toEqual([1, "gap", 5, 6, 7, "gap", 20]);
  });

  it("keeps a constant length while paging through many pages", () => {
    for (let page = 1; page <= 30; page += 1) {
      expect(getPaginationRange(page, 30)).toHaveLength(7);
    }
  });

  it("clamps an out-of-range page and handles no pages", () => {
    expect(getPaginationRange(99, 10)).toEqual([1, "gap", 6, 7, 8, 9, 10]);
    expect(getPaginationRange(-3, 10)).toEqual([1, 2, 3, 4, 5, "gap", 10]);
    expect(getPaginationRange(1, 0)).toEqual([]);
  });
});

describe("Pagination", () => {
  it("renders nothing for a single page", () => {
    const { container } = renderPagination(1, 1);
    expect(container).toBeEmptyDOMElement();
  });

  it("is a labelled navigation with the current page marked aria-current=page and not linked", () => {
    renderPagination(3, 6);
    const nav = screen.getByRole("navigation", { name: "News pages" });

    const current = within(nav).getByText("3");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current.closest("a")).toBeNull();
    expect(
      within(nav)
        .getAllByRole("link")
        .filter((l) => l.getAttribute("aria-current")),
    ).toHaveLength(0);
  });

  it("builds hrefs through getHref and names page links with getPageLabel", () => {
    renderPagination(3, 6);
    expect(screen.getByRole("link", { name: "Page 4" })).toHaveAttribute("href", "/en/news?page=4");
    expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute(
      "href",
      "/en/news?page=2",
    );
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute("href", "/en/news?page=4");
  });

  it("uses the supplied labels, never built-in English", () => {
    render(
      <Pagination
        page={2}
        pageCount={3}
        getHref={(p) => `/p/${p}`}
        label="分页"
        previousLabel="上一页"
        nextLabel="下一页"
      />,
    );
    expect(screen.getByRole("navigation", { name: "分页" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "上一页" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "下一页" })).toBeInTheDocument();
  });

  it("renders unavailable previous/next as aria-disabled text, not links", () => {
    renderPagination(1, 4);
    expect(screen.queryByRole("link", { name: "Previous" })).not.toBeInTheDocument();
    expect(screen.getByText("Previous").closest("[aria-disabled='true']")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Next" })).toBeInTheDocument();
  });

  it('collapses to a compact "page / total" indicator on small screens', () => {
    renderPagination(3, 6);
    const compact = screen.getByText("3 / 6").closest("li");
    expect(compact).toHaveClass("sm:hidden");
    expect(compact?.querySelector('[aria-current="page"]')).toHaveAttribute("aria-label", "Page 3");
    // The numbered links only exist from sm up.
    expect(screen.getByRole("link", { name: "Page 4" }).closest("li")).toHaveClass(
      "hidden",
      "sm:block",
    );
  });

  it("hides the ellipsis from assistive tech", () => {
    renderPagination(5, 12);
    for (const gap of screen.getAllByText("…")) {
      expect(gap).toHaveAttribute("aria-hidden", "true");
    }
  });
});
