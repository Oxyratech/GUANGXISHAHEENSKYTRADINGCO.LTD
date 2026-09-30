import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { LocalDateTime } from "./LocalDateTime";

const ORIGINAL_TZ = process.env.TZ;

afterEach(() => {
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

describe("LocalDateTime", () => {
  it("shows the timestamp in UTC with a visible UTC label", () => {
    render(<LocalDateTime value="2026-06-18T14:05:09.000Z" />);

    expect(screen.getByText("18 Jun 2026, 14:05 UTC")).toBeInTheDocument();
  });

  it("puts the exact ISO value in the datetime attribute and the tooltip", () => {
    render(<LocalDateTime value="2026-06-18T14:05:09.000Z" />);

    const time = screen.getByText(/18 Jun 2026/);
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("datetime", "2026-06-18T14:05:09.000Z");
    expect(time).toHaveAttribute("title", "2026-06-18T14:05:09.000Z");
  });

  it("accepts a Date", () => {
    render(<LocalDateTime value={new Date("2026-01-02T03:04:00Z")} />);

    expect(screen.getByText("2 Jan 2026, 03:04 UTC")).toBeInTheDocument();
  });

  it("can show the date alone", () => {
    render(<LocalDateTime value="2026-06-18T14:05:09.000Z" dateOnly />);

    expect(screen.getByText("18 Jun 2026")).toBeInTheDocument();
  });

  it("does not depend on the machine's time zone", () => {
    const value = "2026-12-31T23:30:00Z";
    const html = (zone: string) => {
      process.env.TZ = zone;
      return renderToStaticMarkup(<LocalDateTime value={value} />);
    };

    const shanghai = html("Asia/Shanghai");
    const losAngeles = html("America/Los_Angeles");

    expect(shanghai).toBe(losAngeles);
    expect(shanghai).toContain("31 Dec 2026, 23:30 UTC");
  });

  it("renders the same text on the server and in the browser", () => {
    const value = "2026-03-08T02:30:00Z";
    const serverDom = document.createElement("div");
    serverDom.innerHTML = renderToStaticMarkup(<LocalDateTime value={value} />);
    const { container } = render(<LocalDateTime value={value} />);

    // Parsed, so attribute-name casing in the serialised HTML cannot matter.
    expect(container.textContent).toBe(serverDom.textContent);
    expect(container.querySelector("time")?.getAttribute("datetime")).toBe(
      serverDom.querySelector("time")?.getAttribute("datetime"),
    );
  });

  it.each([null, undefined, "", "not a date"])(
    "shows a dash for %j, announced as no date",
    (value) => {
      const { container } = render(<LocalDateTime value={value} />);

      expect(container.querySelector("time")).toBeNull();
      expect(container).toHaveTextContent("No date");
      expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent("—");
    },
  );
});
