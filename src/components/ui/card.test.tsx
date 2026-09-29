import { render, screen } from "@testing-library/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardLink,
  CardTitle,
} from "./card";

vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);

describe("Card", () => {
  it("composes header, title, description, content and footer", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Import & export</CardTitle>
          <CardDescription>Goods trade coordination</CardDescription>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );
    expect(screen.getByRole("heading", { level: 3, name: "Import & export" })).toBeInTheDocument();
    expect(screen.getByText("Goods trade coordination")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });

  it("lets the title level fit the page outline", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle as="h2">Level two</CardTitle>
        </CardHeader>
      </Card>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Level two" })).toBeInTheDocument();
  });

  it("renders as another element when asked", () => {
    render(
      <ul>
        <Card as="li" data-testid="card" />
      </ul>,
    );
    expect(screen.getByTestId("card").tagName).toBe("LI");
  });

  describe("interactive", () => {
    it("has exactly one link, named by the title, that stretches over the card", () => {
      render(
        <Card interactive>
          <CardHeader>
            <CardTitle>
              <CardLink href="/business/import-export">Import & export</CardLink>
            </CardTitle>
            <CardDescription>Summary text</CardDescription>
          </CardHeader>
        </Card>,
      );
      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(1);
      expect(links[0]).toHaveAccessibleName("Import & export");
      expect(links[0]).toHaveAttribute("href", "/en/business/import-export");
      // The overlay is the link's ::after; the card is its positioning context.
      expect(links[0]).toHaveClass("after:absolute", "after:inset-0");
      expect(links[0].closest("div.relative")).not.toBeNull();
    });

    it("adds hover and focus styling only when interactive", () => {
      const { rerender } = render(<Card data-testid="card" />);
      expect(screen.getByTestId("card").className).not.toContain("hover:shadow-raised");
      rerender(<Card interactive data-testid="card" />);
      expect(screen.getByTestId("card").className).toContain("hover:shadow-raised");
    });

    it("renders external card links as plain anchors", () => {
      render(
        <Card interactive>
          <CardTitle>
            <CardLink href="https://example.com">Outside</CardLink>
          </CardTitle>
        </Card>,
      );
      const link = screen.getByRole("link", { name: "Outside" });
      expect(link).not.toHaveAttribute("data-locale-link");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });
});
