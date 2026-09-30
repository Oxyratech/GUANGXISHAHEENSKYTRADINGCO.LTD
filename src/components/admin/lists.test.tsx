import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildPageMeta } from "@/server/admin/pagination";

vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/ui/test-utils")).navigationMock,
);

import { AdminPagination } from "./AdminPagination";
import { FilterBar } from "./FilterBar";

function hiddenInputs(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLInputElement>('input[type="hidden"]')].map((input) => [
    input.name,
    input.value,
  ]);
}

describe("FilterBar", () => {
  function renderBar(searchParams: Record<string, string | string[] | undefined>) {
    return render(
      <FilterBar
        pathname="/admin/inquiries"
        searchParams={searchParams}
        filterKeys={["q", "status"]}
        label="Filter inquiries"
      >
        <input name="q" aria-label="Search" defaultValue={String(searchParams.q ?? "")} />
        <select name="status" aria-label="Status" defaultValue={String(searchParams.status ?? "")}>
          <option value="">Any</option>
          <option value="NEW">New</option>
        </select>
      </FilterBar>,
    );
  }

  it("is a search region and a GET form that submits to the list's own path", () => {
    renderBar({});

    const form = screen.getByRole("search", { name: "Filter inquiries" });
    expect(form.tagName).toBe("FORM");
    expect(form).toHaveAttribute("action", "/admin/inquiries");
    expect(form).not.toHaveAttribute("method", "post");
    expect(within(form).getByRole("button", { name: "Apply" })).toHaveAttribute("type", "submit");
  });

  it("carries parameters that are not filters, and drops page and the filters themselves", () => {
    const { container } = renderBar({
      q: "acme",
      status: "NEW",
      page: "3",
      sort: "createdAt",
      pageSize: "50",
    });

    expect(hiddenInputs(container)).toEqual([
      ["sort", "createdAt"],
      ["pageSize", "50"],
    ]);
  });

  it("carries repeated parameters", () => {
    const { container } = renderBar({ tag: ["a", "b"], page: "2" });

    expect(hiddenInputs(container)).toEqual([
      ["tag", "a"],
      ["tag", "b"],
    ]);
  });

  it("offers Reset filters only while a filter is applied", () => {
    const { unmount } = renderBar({ sort: "createdAt" });
    expect(screen.queryByRole("link", { name: "Reset filters" })).not.toBeInTheDocument();
    unmount();

    renderBar({ q: "acme" });
    expect(screen.getByRole("link", { name: "Reset filters" })).toBeInTheDocument();
  });

  it("does not count an empty filter as applied", () => {
    renderBar({ q: "", status: "" });

    expect(screen.queryByRole("link", { name: "Reset filters" })).not.toBeInTheDocument();
  });

  it("resets the filters and page, but keeps the sort order", () => {
    renderBar({ q: "acme", status: "NEW", page: "4", sort: "createdAt" });

    expect(screen.getByRole("link", { name: "Reset filters" })).toHaveAttribute(
      "href",
      "/admin/inquiries?sort=createdAt",
    );
  });

  it("resets to the bare path when nothing else is carried", () => {
    renderBar({ q: "acme" });

    expect(screen.getByRole("link", { name: "Reset filters" })).toHaveAttribute(
      "href",
      "/admin/inquiries",
    );
  });

  it("shows the current values in its controls", () => {
    renderBar({ q: "acme", status: "NEW" });

    expect(screen.getByRole("textbox", { name: "Search" })).toHaveValue("acme");
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveValue("NEW");
  });
});

describe("AdminPagination", () => {
  it("summarises the rows shown", () => {
    render(
      <AdminPagination
        meta={buildPageMeta(1320, 2, 20)}
        pathname="/admin/inquiries"
        searchParams={{}}
        itemLabel="inquiries"
      />,
    );

    expect(screen.getByText("Showing 21–40 of 1,320 inquiries")).toBeInTheDocument();
  });

  it("links to other pages and keeps the filters and sort", () => {
    render(
      <AdminPagination
        meta={buildPageMeta(95, 2, 20)}
        pathname="/admin/inquiries"
        searchParams={{ status: "NEW", sort: "createdAt", page: "2" }}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(within(nav).getByRole("link", { name: "Page 3" })).toHaveAttribute(
      "href",
      "/admin/inquiries?status=NEW&sort=createdAt&page=3",
    );
    // Page 1 is the canonical URL, so it carries no page parameter.
    expect(within(nav).getByRole("link", { name: "Page 1" })).toHaveAttribute(
      "href",
      "/admin/inquiries?status=NEW&sort=createdAt",
    );
  });

  it("marks the current page", () => {
    render(
      <AdminPagination
        meta={buildPageMeta(95, 2, 20)}
        pathname="/admin/inquiries"
        searchParams={{}}
      />,
    );

    const current = screen.getAllByText("2").find((el) => el.getAttribute("aria-current"));
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("shows the summary but no page links for a single page", () => {
    render(
      <AdminPagination
        meta={buildPageMeta(8, 1, 20)}
        pathname="/admin/inquiries"
        searchParams={{}}
        itemLabel="inquiries"
      />,
    );

    expect(screen.getByText("Showing 1–8 of 8 inquiries")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Pagination" })).not.toBeInTheDocument();
  });

  it("renders nothing for an empty list, which shows its own empty state", () => {
    const { container } = render(
      <AdminPagination meta={buildPageMeta(0, 1, 20)} pathname="/admin/x" searchParams={{}} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
