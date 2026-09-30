import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Link from "next/link";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CopyValue } from "./CopyValue";
import { DefinitionList } from "./DefinitionList";
import { EmptyPanel } from "./EmptyPanel";
import { PageHeader } from "./PageHeader";
import { RegistryNotice } from "./RegistryNotice";
import { StatCard } from "./StatCard";
import { StatusBadge } from "./StatusBadge";

describe("PageHeader", () => {
  it("renders the page's h1, its description and its actions", () => {
    render(
      <PageHeader
        title="Inquiries"
        description="Requests from buyers."
        actions={<button type="button">Export</button>}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Inquiries" })).toBeInTheDocument();
    expect(screen.getByText("Requests from buyers.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
  });

  it("renders breadcrumbs with the last item as the current page, not a link", () => {
    render(
      <PageHeader
        title="INQ-1"
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Inquiries", href: "/admin/inquiries" },
          { label: "INQ-1" },
        ]}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(nav).getByRole("link", { name: "Inquiries" })).toHaveAttribute(
      "href",
      "/admin/inquiries",
    );
    expect(within(nav).getAllByRole("link")).toHaveLength(2);
    expect(within(nav).getByText("INQ-1")).toHaveAttribute("aria-current", "page");
  });

  it("omits the breadcrumb landmark and the actions when there are none", () => {
    render(<PageHeader title="Settings" />);

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});

describe("StatCard", () => {
  it("shows the label and the real number, formatted", () => {
    render(<StatCard label="Inquiries" value={12345} description="in total" />);

    expect(screen.getByText("Inquiries")).toBeInTheDocument();
    expect(screen.getByText("12,345")).toBeInTheDocument();
    expect(screen.getByText("in total")).toBeInTheDocument();
  });

  it("shows zero as zero", () => {
    render(<StatCard label="New inquiries" value={0} />);

    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("makes the whole card one link when given an href", () => {
    render(<StatCard label="New inquiries" value={3} href="/admin/inquiries?status=NEW" />);

    const link = screen.getByRole("link", { name: "New inquiries" });
    expect(link).toHaveAttribute("href", "/admin/inquiries?status=NEW");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("is not a link without an href", () => {
    render(<StatCard label="Products" value={3} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("highlights the card while keeping its meaning in the text", () => {
    const { container } = render(<StatCard label="New inquiries" value={3} tone="highlight" />);

    expect(container.firstElementChild?.className).toContain("border-gold-400");
    expect(screen.getByText("New inquiries")).toBeInTheDocument();
  });
});

describe("StatusBadge", () => {
  it("writes the status in words", () => {
    render(
      <>
        <StatusBadge status="NEW" />
        <StatusBadge status="NEGOTIATION" />
        <StatusBadge status="PUBLISHED" />
        <StatusBadge status="IN_REVIEW" />
      </>,
    );

    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.getByText("Negotiation")).toBeInTheDocument();
    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(screen.getByText("In review")).toBeInTheDocument();
  });

  it("gives the same status the same tone in every vocabulary", () => {
    render(
      <>
        <StatusBadge status="NEW" label="Inquiry new" />
        <StatusBadge status="NEW" label="Message new" />
      </>,
    );

    expect(screen.getByText("Inquiry new").className).toBe(
      screen.getByText("Message new").className,
    );
  });

  it("tones statuses by meaning and defaults to neutral for unknown ones", () => {
    render(
      <>
        <StatusBadge status="COMPLETED" />
        <StatusBadge status="NEW" />
        <StatusBadge status="DRAFT" />
        <StatusBadge status="SOMETHING_ELSE" />
      </>,
    );

    expect(screen.getByText("Completed").className).toContain("bg-success-50");
    expect(screen.getByText("New").className).toContain("bg-blue-50");
    expect(screen.getByText("Draft").className).toContain("bg-surface");
    expect(screen.getByText("Something else").className).toContain("bg-surface");
  });

  it("accepts a label and a tone override", () => {
    render(<StatusBadge status="NEW" label="Unread" tone="danger" />);

    const badge = screen.getByText("Unread");
    expect(badge.className).toContain("bg-danger-50");
  });
});

describe("DefinitionList", () => {
  it("is a real description list", () => {
    render(
      <DefinitionList
        items={[
          { label: "Company", value: "Acme Trading" },
          { label: "Country", value: "China" },
        ]}
      />,
    );

    const terms = screen.getAllByRole("term");
    const definitions = screen.getAllByRole("definition");
    expect(terms.map((term) => term.textContent)).toEqual(["Company", "Country"]);
    expect(definitions.map((definition) => definition.textContent)).toEqual([
      "Acme Trading",
      "China",
    ]);
  });

  it("shows a dash, announced as 'Not provided', for a missing value", () => {
    render(
      <DefinitionList
        items={[
          { label: "Phone", value: null },
          { label: "Fax", value: "" },
          { label: "Zero", value: 0 },
        ]}
      />,
    );

    const definitions = screen.getAllByRole("definition");
    expect(definitions[0]).toHaveTextContent("Not provided");
    expect(definitions[1]).toHaveTextContent("Not provided");
    expect(definitions[2]).toHaveTextContent("0");
    expect(definitions[2]).not.toHaveTextContent("Not provided");
  });
});

describe("EmptyPanel", () => {
  it("says what is missing and offers the next step", () => {
    render(
      <EmptyPanel
        title="No products yet"
        description="Add the first one to see it here."
        action={<Link href="/admin/products/new">New product</Link>}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "No products yet" })).toBeInTheDocument();
    expect(screen.getByText("Add the first one to see it here.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New product" })).toBeInTheDocument();
  });
});

describe("RegistryNotice", () => {
  it("says the content is managed in code and names the file", () => {
    render(<RegistryNotice filePath="src/content/services.ts" />);

    expect(screen.getByText("Managed in code")).toBeInTheDocument();
    expect(screen.getByText("src/content/services.ts")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/cannot be edited here/);
  });

  it("links to the public page in English, in a new tab, safely", () => {
    render(
      <RegistryNotice filePath="src/content/services.ts" publicPath="/business/import-export" />,
    );

    const link = screen.getByRole("link", { name: /View on the public site/ });
    expect(link).toHaveAttribute("href", "/en/business/import-export");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveTextContent("(opens in a new tab)");
  });

  it("links the home page as /en", () => {
    render(<RegistryNotice filePath="x.ts" publicPath="/" />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/en");
  });

  it("has no link when there is no public page", () => {
    render(<RegistryNotice filePath="src/content/faq.ts" />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("accepts its own explanation", () => {
    render(<RegistryNotice filePath="x.ts">Edit the messages instead.</RegistryNotice>);

    expect(screen.getByText("Edit the messages instead.")).toBeInTheDocument();
  });
});

describe("CopyValue", () => {
  // user-event installs its own clipboard when it is set up, so the spy is placed after setup().
  function setup(options?: Parameters<typeof userEvent.setup>[0]) {
    const user = userEvent.setup(options);
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    return { user, writeText };
  }

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows the value and a button named for what it copies", () => {
    render(<CopyValue value="INQ-7K3Q9M2X" label="reference code" />);

    expect(screen.getByText("INQ-7K3Q9M2X")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy reference code" })).toBeInTheDocument();
  });

  it("copies the value and says so in words", async () => {
    const { user, writeText } = setup();
    render(<CopyValue value="INQ-7K3Q9M2X" label="reference code" />);

    await user.click(screen.getByRole("button", { name: "Copy reference code" }));

    expect(writeText).toHaveBeenCalledWith("INQ-7K3Q9M2X");
    expect(await screen.findByRole("status")).toHaveTextContent("Copied");
  });

  it("says so when the clipboard refuses", async () => {
    const { user, writeText } = setup();
    writeText.mockRejectedValue(new Error("denied"));
    render(<CopyValue value="x" label="value" />);

    await user.click(screen.getByRole("button", { name: "Copy value" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Copy failed");
  });

  it("clears the message after a moment", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { user } = setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CopyValue value="x" label="value" />);

    await user.click(screen.getByRole("button", { name: "Copy value" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Copied");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
