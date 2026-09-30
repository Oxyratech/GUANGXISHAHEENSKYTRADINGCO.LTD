import { render, screen, within } from "@testing-library/react";
import { CookieTable } from "./CookieTable";

const HEADERS = { name: "Cookie", purpose: "Purpose", setFor: "Set for", lifetime: "Lifetime" };
const ROWS = [
  {
    id: "language",
    name: "NEXT_LOCALE",
    purpose: "Remembers the language.",
    setFor: "Visitors who choose a language",
    lifetime: "Session",
  },
  {
    id: "session",
    name: "__Host-shaheen_session",
    purpose: "Keeps an administrator signed in.",
    setFor: "Administrators only",
    lifetime: "Up to 7 days",
  },
];

describe("CookieTable", () => {
  it("is a captioned table with a header row and one row per cookie", () => {
    render(<CookieTable caption="Cookies set by this website" headers={HEADERS} rows={ROWS} />);
    const table = screen.getByRole("table", { name: "Cookies set by this website" });

    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["Cookie", "Purpose", "Set for", "Lifetime"]);
    expect(within(table).getAllByRole("row")).toHaveLength(1 + ROWS.length);
  });

  it("names each row by its cookie, shown left to right in every language", () => {
    render(<CookieTable caption="Cookies" headers={HEADERS} rows={ROWS} />);
    const rowHeaders = screen.getAllByRole("rowheader");

    expect(rowHeaders.map((header) => header.textContent)).toEqual([
      "NEXT_LOCALE",
      "__Host-shaheen_session",
    ]);
    for (const header of rowHeaders) {
      expect(header.querySelector("code")).toHaveAttribute("dir", "ltr");
    }
  });

  it("scrolls sideways inside a named region that keyboard users can focus", () => {
    render(<CookieTable caption="Cookies set by this website" headers={HEADERS} rows={ROWS} />);
    const region = screen.getByRole("region", { name: "Cookies set by this website" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region).toHaveClass("overflow-x-auto");
  });
});
