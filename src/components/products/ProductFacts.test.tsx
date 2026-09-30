import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { ProductDocument, ProductSpecificationRow } from "@/server/products";
import { DocumentList } from "./DocumentList";
import { SpecificationTable } from "./SpecificationTable";
import { renderServer } from "./test-utils";

const mocks = vi.hoisted(() => ({ trackEvent: vi.fn() }));

vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);
vi.mock("@/lib/analytics/track", () => ({ trackEvent: mocks.trackEvent }));

const SPECS: ProductSpecificationRow[] = [
  { label: "Length", value: "40 mm", contentLocale: "en" },
  { label: "Material", value: "Carbon steel", contentLocale: "en" },
];

const DOC_ID = "0a1b2c3d-0000-4000-8000-0000000000d1";
const DOCUMENTS: ProductDocument[] = [
  {
    kind: "SPECIFICATION_SHEET",
    title: "Bolt specification",
    contentLocale: "en",
    href: `/media/${DOC_ID}`,
    fileName: "bolt-spec.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1_572_864,
  },
  {
    kind: "CERTIFICATE",
    title: "Test report",
    contentLocale: "en",
    href: "/media/0a1b2c3d-0000-4000-8000-0000000000d2",
    fileName: "report.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    sizeBytes: 512,
  },
];

beforeEach(() => {
  mocks.trackEvent.mockReset();
});

describe("SpecificationTable", () => {
  it("is a real table named by its caption, with a row header per specification", async () => {
    await renderServer(<SpecificationTable specifications={SPECS} name="Steel bolt" locale="en" />);

    const table = screen.getByRole("table", { name: "Specifications of Steel bolt" });
    expect(
      within(table)
        .getAllByRole("rowheader")
        .map((cell) => cell.textContent),
    ).toEqual(["Length", "Material"]);
    expect(
      within(table)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["40 mm", "Carbon steel"]);
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual(["Specification", "Value"]);
  });

  it("renders nothing without specifications", async () => {
    const { container } = await renderServer(
      <SpecificationTable specifications={[]} name="Steel bolt" locale="en" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("marks rows that are in another language than the page", async () => {
    await renderServer(
      <SpecificationTable
        specifications={[{ label: "Length", value: "40 mm", contentLocale: "en" }]}
        name="مسمار"
        locale="ar"
      />,
    );
    const header = screen.getByRole("rowheader", { name: "Length" });
    expect(header).toHaveAttribute("lang", "en");
    expect(header).toHaveAttribute("dir", "ltr");
    expect(screen.getByRole("cell", { name: "40 mm" })).toHaveAttribute("lang", "en");
  });

  it("does not mark rows in the page language", async () => {
    await renderServer(
      <SpecificationTable
        specifications={[{ label: "长度", value: "40 毫米", contentLocale: "zh" }]}
        name="螺栓"
        locale="zh"
      />,
    );
    expect(screen.getByRole("rowheader", { name: "长度" })).not.toHaveAttribute("lang");
  });
});

describe("DocumentList", () => {
  it("lists public documents with kind, file type and size, each with a download link", async () => {
    await renderServer(
      <DocumentList documents={DOCUMENTS} name="Steel bolt" productSlug="steel-bolt" locale="en" />,
    );

    const list = screen.getByRole("list", { name: "Documents for Steel bolt" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);

    expect(within(items[0]!).getByText("Bolt specification")).toBeInTheDocument();
    expect(within(items[0]!).getByText("Specification sheet")).toBeInTheDocument();
    expect(within(items[0]!).getByText("PDF")).toBeInTheDocument();
    expect(within(items[0]!).getByText("1.5 MB")).toBeInTheDocument();
    expect(within(items[1]!).getByText("Certificate")).toBeInTheDocument();
    expect(within(items[1]!).getByText("DOCX")).toBeInTheDocument();
    expect(within(items[1]!).getByText("512 byte")).toBeInTheDocument();
  });

  it("links straight to the public media route, with a full accessible name that starts with the visible label", async () => {
    await renderServer(
      <DocumentList documents={DOCUMENTS} name="Steel bolt" productSlug="steel-bolt" locale="en" />,
    );

    const link = screen.getByRole("link", { name: "Download Bolt specification (PDF, 1.5 MB)" });
    expect(link).toHaveAttribute("href", `/media/${DOC_ID}`);
    expect(link).toHaveTextContent("Download");
  });

  it("counts a click as a document_viewed event with the kind and product, and no personal data", async () => {
    await renderServer(
      <DocumentList documents={DOCUMENTS} name="Steel bolt" productSlug="steel-bolt" locale="en" />,
    );

    // jsdom cannot navigate: cancel the click after React has handled it.
    document.addEventListener("click", (event) => event.preventDefault(), { once: true });
    fireEvent.click(screen.getByRole("link", { name: /Download Bolt specification/ }));

    expect(mocks.trackEvent).toHaveBeenCalledTimes(1);
    expect(mocks.trackEvent).toHaveBeenCalledWith("document_viewed", {
      document: "specification-sheet",
      product: "steel-bolt",
      locale: "en",
    });
  });

  it("renders nothing without documents", async () => {
    const { container } = await renderServer(
      <DocumentList documents={[]} name="Steel bolt" productSlug="steel-bolt" locale="en" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("translates the kind and the action in the page language", async () => {
    await renderServer(
      <DocumentList documents={DOCUMENTS} name="螺栓" productSlug="steel-bolt" locale="zh" />,
    );
    expect(screen.getByText("规格书")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^下载Bolt specification/ })).toBeInTheDocument();
  });

  it("isolates file type and size in right-to-left text", async () => {
    const { container } = await renderServer(
      <DocumentList documents={DOCUMENTS} name="مسمار" productSlug="steel-bolt" locale="ar" />,
    );
    expect(container.querySelectorAll("bdi").length).toBeGreaterThanOrEqual(4);
  });
});
