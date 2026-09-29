import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataTable, type DataTableColumn } from "./data-table";

vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);

interface Row {
  id: string;
  name: string;
  scope: string;
}

const ROWS: Row[] = [
  { id: "a", name: "Toys", scope: "Consumer goods" },
  { id: "b", name: "Moulds", scope: "Machinery" },
];

const COLUMNS: DataTableColumn<Row>[] = [
  { key: "name", header: "Name", cell: (r) => r.name, sortable: true, rowHeader: true },
  { key: "scope", header: "Scope", cell: (r) => r.scope },
];

describe("DataTable", () => {
  it("renders a captioned table in a named, keyboard-scrollable region", () => {
    render(
      <DataTable
        caption="Registered scope"
        columns={COLUMNS}
        rows={ROWS}
        getRowKey={(r) => r.id}
      />,
    );
    const region = screen.getByRole("region", { name: "Registered scope" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region).toHaveClass("overflow-x-auto");
    expect(within(region).getByRole("table", { name: "Registered scope" })).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual([
      "Name",
      "Scope",
    ]);
  });

  it("renders identifying cells as row headers", () => {
    render(<DataTable caption="Scope" columns={COLUMNS} rows={ROWS} getRowKey={(r) => r.id} />);
    expect(screen.getByRole("rowheader", { name: "Toys" })).toHaveAttribute("scope", "row");
    expect(screen.getByRole("cell", { name: "Machinery" })).toBeInTheDocument();
  });

  it("shows the empty state in the body but keeps header and caption", () => {
    render(
      <DataTable
        caption="Scope"
        columns={COLUMNS}
        rows={[]}
        getRowKey={(r: Row) => r.id}
        emptyState={<p>Nothing published yet</p>}
      />,
    );
    expect(screen.getByText("Nothing published yet").closest("td")).toHaveAttribute("colspan", "2");
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByText("Scope", { selector: "caption" })).toBeInTheDocument();
  });

  it("does not render the empty state when there are rows", () => {
    render(
      <DataTable
        caption="Scope"
        columns={COLUMNS}
        rows={ROWS}
        getRowKey={(r) => r.id}
        emptyState={<p>Nothing published yet</p>}
      />,
    );
    expect(screen.queryByText("Nothing published yet")).not.toBeInTheDocument();
  });

  it("can hide the caption visually while keeping it for assistive tech", () => {
    render(
      <DataTable
        caption="Scope"
        hideCaption
        columns={COLUMNS}
        rows={ROWS}
        getRowKey={(r) => r.id}
      />,
    );
    expect(screen.getByText("Scope", { selector: "caption" })).toHaveClass("sr-only");
  });

  describe("sorting", () => {
    it("sets aria-sort only on sortable headers and reflects the active direction", () => {
      const { rerender } = render(
        <DataTable
          caption="Scope"
          columns={COLUMNS}
          rows={ROWS}
          getRowKey={(r) => r.id}
          sort={{ key: "name", direction: "asc" }}
          getSortHref={(key, dir) => `/x?sort=${key}&dir=${dir}`}
        />,
      );
      expect(screen.getByRole("columnheader", { name: "Name" })).toHaveAttribute(
        "aria-sort",
        "ascending",
      );
      expect(screen.getByRole("columnheader", { name: "Scope" })).not.toHaveAttribute("aria-sort");

      rerender(
        <DataTable
          caption="Scope"
          columns={COLUMNS}
          rows={ROWS}
          getRowKey={(r) => r.id}
          sort={{ key: "name", direction: "desc" }}
          getSortHref={(key, dir) => `/x?sort=${key}&dir=${dir}`}
        />,
      );
      expect(screen.getByRole("columnheader", { name: "Name" })).toHaveAttribute(
        "aria-sort",
        "descending",
      );

      rerender(
        <DataTable
          caption="Scope"
          columns={COLUMNS}
          rows={ROWS}
          getRowKey={(r) => r.id}
          sort={null}
          getSortHref={(key, dir) => `/x?sort=${key}&dir=${dir}`}
        />,
      );
      expect(screen.getByRole("columnheader", { name: "Name" })).toHaveAttribute(
        "aria-sort",
        "none",
      );
    });

    it("renders sortable headers as links to the next direction", () => {
      render(
        <DataTable
          caption="Scope"
          columns={COLUMNS}
          rows={ROWS}
          getRowKey={(r) => r.id}
          sort={{ key: "name", direction: "asc" }}
          getSortHref={(key, dir) => `/x?sort=${key}&dir=${dir}`}
        />,
      );
      expect(screen.getByRole("link", { name: "Name" })).toHaveAttribute(
        "href",
        "/en/x?sort=name&dir=desc",
      );
      expect(screen.queryByRole("link", { name: "Scope" })).not.toBeInTheDocument();
    });

    it("renders sortable headers as buttons that report the next direction", async () => {
      const onSortChange = vi.fn();
      const user = userEvent.setup();
      render(
        <DataTable
          caption="Scope"
          columns={COLUMNS}
          rows={ROWS}
          getRowKey={(r) => r.id}
          sort={null}
          onSortChange={onSortChange}
        />,
      );
      await user.click(screen.getByRole("button", { name: "Name" }));
      expect(onSortChange).toHaveBeenLastCalledWith("name", "asc");
    });

    it("leaves headers plain when no sort handler is given", () => {
      render(<DataTable caption="Scope" columns={COLUMNS} rows={ROWS} getRowKey={(r) => r.id} />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Name" })).not.toHaveAttribute("aria-sort");
    });
  });

  it("keys rows by getRowKey so reordering keeps row identity", () => {
    const { rerender } = render(
      <DataTable caption="Scope" columns={COLUMNS} rows={ROWS} getRowKey={(r) => r.id} />,
    );
    const toysRow = screen.getByRole("rowheader", { name: "Toys" }).closest("tr");
    rerender(
      <DataTable
        caption="Scope"
        columns={COLUMNS}
        rows={[...ROWS].reverse()}
        getRowKey={(r) => r.id}
      />,
    );
    expect(screen.getByRole("rowheader", { name: "Toys" }).closest("tr")).toBe(toysRow);
  });
});
