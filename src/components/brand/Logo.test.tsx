import { render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { COMPANY } from "@/config/company";
import { Logo } from "./Logo";
import { LogoMark } from "./LogoMark";
import { Wordmark } from "./Wordmark";

// next-intl's navigation helpers cannot be imported by Vitest without a config change, so the
// locale-aware Link is replaced by a stand-in that exposes what Logo hands to it.
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...props }: ComponentProps<"a"> & { href: string }) => (
    <a data-locale-aware="true" href={href} {...props} />
  ),
}));

describe("LogoMark", () => {
  it("is decorative by default", () => {
    const { container } = render(<LogoMark />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).not.toHaveAttribute("role");
    expect(svg).toHaveAttribute("focusable", "false");
  });

  it("becomes a named image when given a title", () => {
    render(<LogoMark title="Shaheen Sky" />);
    expect(screen.getByRole("img", { name: "Shaheen Sky" })).toBeInTheDocument();
  });

  it("colours only the horizon gold, in a shade that suits the background", () => {
    const light = render(<LogoMark tone="onLight" />).container.querySelector("rect");
    const dark = render(<LogoMark tone="onDark" />).container.querySelector("rect");
    expect(light).toHaveClass("fill-gold-500");
    expect(dark).toHaveClass("fill-gold-400");
  });
});

describe("Wordmark", () => {
  it("shows the brand name and the registered English name, pinned to Latin", () => {
    const { container } = render(<Wordmark />);
    const root = container.firstElementChild;
    expect(root).toHaveAttribute("lang", "en");
    expect(root).toHaveAttribute("dir", "ltr");
    expect(root).toHaveTextContent(COMPANY.brandName);
    expect(screen.getByText(COMPANY.legalNameEn)).toBeInTheDocument();
  });

  it("can drop the legal-name line, or hide it on narrow screens only", () => {
    const never = render(<Wordmark legalName="never" />);
    expect(never.queryByText(COMPANY.legalNameEn)).not.toBeInTheDocument();
    never.unmount();

    render(<Wordmark legalName="sm-up" />);
    expect(screen.getByText(COMPANY.legalNameEn)).toHaveClass("hidden", "sm:block");
  });

  it("uses only logical spacing utilities", () => {
    const { container } = render(<Wordmark align="center" />);
    expect(container.innerHTML).not.toMatch(/\b(?:ml|mr|pl|pr)-|text-left|text-right/);
  });
});

describe("Logo", () => {
  it("links to the home page through the locale-aware Link", () => {
    render(<Logo asLink label="Shaheen Sky, home" />);
    const link = screen.getByRole("link", { name: "Shaheen Sky, home" });
    expect(link).toHaveAttribute("href", "/");
    expect(link).toHaveAttribute("data-locale-aware", "true");
  });

  it("falls back to the visible wordmark as the link's accessible name", () => {
    render(<Logo asLink />);
    const name = screen.getByRole("link").textContent ?? "";
    expect(name).toContain(COMPANY.brandName);
    expect(name).toContain(COMPANY.legalNameEn);
  });

  it("is not a link unless asked to be", () => {
    render(<Logo />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("becomes one named image when a label is given without a link", () => {
    render(<Logo label="Shaheen Sky" />);
    expect(screen.getByRole("img", { name: "Shaheen Sky" })).toBeInTheDocument();
  });

  it("keeps the lockup left-to-right and the Latin name Latin, whatever the page direction", () => {
    render(
      <div dir="rtl" lang="ar">
        <Logo asLink />
      </div>,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("dir", "ltr");
    expect(within(link).getByText(COMPANY.legalNameEn).closest("[lang]")).toHaveAttribute(
      "lang",
      "en",
    );
  });

  it("stacks and centres the lockup in the stacked variant", () => {
    const { container } = render(<Logo variant="stacked" />);
    expect(container.firstElementChild).toHaveClass("flex-col", "items-center");
    expect(screen.getByText(COMPANY.legalNameEn).parentElement).toHaveClass("items-center");
  });

  it("gives the link a 44px minimum hit area, even at the compact size", () => {
    render(<Logo asLink size="sm" />);
    expect(screen.getByRole("link")).toHaveClass("min-h-11");
  });

  it("switches the palette with the tone", () => {
    const { container } = render(<Logo tone="onDark" />);
    expect(container.querySelector("svg")).toHaveClass("text-white");
    expect(screen.getByText(COMPANY.legalNameEn)).toHaveClass("text-white/75");
  });
});
