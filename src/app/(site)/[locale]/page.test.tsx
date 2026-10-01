import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  intlServerMock,
  MESSAGES,
  renderServer,
  resetNavigation,
} from "@/components/home/test-utils";
import { STATIC_PUBLIC_PATHS } from "@/config/routes";
import { CATEGORIES } from "@/content/categories";
import { SERVICE_SLUGS } from "@/content/services";
import { LOCALES, type Locale } from "@/i18n/locales";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  getPublicContactChannels: vi.fn(async () => ({}) as Record<string, string>),
}));

vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/home/test-utils")).navigationMock,
);
vi.mock(
  "next-intl/server",
  async () => (await import("@/components/home/test-utils")).intlServerMock,
);
vi.mock("@/server/settings", () => ({
  getPublicContactChannels: mocks.getPublicContactChannels,
  mailtoHref: (email: string) => `mailto:${email}`,
  telHref: (phone: string) => `tel:${phone.replace(/\s+/g, "")}`,
  whatsappHref: (value: string) => `https://wa.me/${value.replace(/\D/g, "")}`,
}));

import HomePage from "./page";

const props = (locale: string) => ({ params: Promise.resolve({ locale }) }) as never;

async function renderHome(locale: Locale = "en") {
  resetNavigation("/", locale);
  return renderServer(await HomePage(props(locale)), locale);
}

const allHrefs = () => [...document.querySelectorAll("a")].map((link) => link.getAttribute("href"));

beforeEach(() => {
  mocks.notFound.mockClear();
  mocks.getPublicContactChannels.mockReset();
  mocks.getPublicContactChannels.mockResolvedValue({});
  intlServerMock.setRequestLocale.mockClear();
});

describe("home page", () => {
  it("has exactly one h1 (the tagline), fixes the request locale, and renders no <main>", async () => {
    await renderHome();

    expect(intlServerMock.setRequestLocale).toHaveBeenCalledWith("en");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(MESSAGES.en.common.tagline);
    expect(document.querySelector("main")).toBeNull();
  });

  it("renders the credibility strip with exactly the three registration facts", async () => {
    await renderHome();

    const strip = screen
      .getByRole("heading", { name: MESSAGES.en.home.credibility.title })
      .closest("section") as HTMLElement;
    const terms = within(strip).getAllByRole("term");
    expect(terms.map((term) => term.textContent)).toEqual([
      MESSAGES.en.home.credibility.facts.established,
      MESSAGES.en.home.credibility.facts.location,
      MESSAGES.en.home.credibility.facts.focus,
    ]);
    expect(
      within(strip).getByText(MESSAGES.en.home.credibility.values.location),
    ).toBeInTheDocument();
    expect(within(strip).getByText(MESSAGES.en.home.credibility.values.focus)).toBeInTheDocument();
    expect(within(strip).getByRole("link", { name: "business license" })).toHaveAttribute(
      "href",
      "/en/company-information",
    );
  });

  it("links every one of the six business lines to its page", async () => {
    await renderHome();

    const section = screen
      .getByRole("heading", { name: MESSAGES.en.home.business.title })
      .closest("section") as HTMLElement;
    for (const slug of SERVICE_SLUGS) {
      expect(
        within(section).getByRole("link", { name: MESSAGES.en.services[slug].name }),
      ).toHaveAttribute("href", `/en/business/${slug}`);
    }
  });

  it("links every one of the twelve product categories to its page", async () => {
    await renderHome();

    const section = screen
      .getByRole("heading", { name: MESSAGES.en.home.categories.title })
      .closest("section") as HTMLElement;
    for (const category of CATEGORIES) {
      expect(
        within(section).getByRole("link", {
          name: MESSAGES.en.categories[category.slug].name,
        }),
      ).toHaveAttribute("href", `/en/products/${category.slug}`);
    }
  });

  it("explains the sourcing brief without rendering a fake form", async () => {
    await renderHome();

    const section = screen
      .getByRole("heading", { name: MESSAGES.en.home.sourcing.title })
      .closest("section") as HTMLElement;
    expect(within(section).queryByRole("textbox")).toBeNull();
    expect(section.querySelector("form")).toBeNull();
    expect(section.querySelector("input")).toBeNull();
    expect(
      within(section).getByRole("link", { name: MESSAGES.en.home.sourcing.cta }),
    ).toHaveAttribute("href", "/en/inquiry");
  });

  it("every primary CTA points at a route that exists", async () => {
    await renderHome();

    const targets = [
      "/inquiry",
      "/business",
      "/products",
      "/contact",
      "/company-information",
      "/global-trade/how-it-works",
    ];
    for (const path of targets) {
      expect(STATIC_PUBLIC_PATHS).toContain(path);
      expect(allHrefs()).toContain(`/en${path}`);
    }
  });

  it("hides contact channels when none are configured", async () => {
    mocks.getPublicContactChannels.mockResolvedValue({});
    await renderHome();

    expect(screen.queryByText(MESSAGES.en.home.contact.channels.email)).not.toBeInTheDocument();
    expect(screen.queryByText(MESSAGES.en.home.contact.channels.phone)).not.toBeInTheDocument();
    expect(screen.queryByText(MESSAGES.en.home.contact.channels.whatsapp)).not.toBeInTheDocument();
  });

  it("shows only the contact channels that are actually configured", async () => {
    mocks.getPublicContactChannels.mockResolvedValue({ email: "sales@example.com" });
    await renderHome();

    expect(screen.getByText(MESSAGES.en.home.contact.channels.email)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sales@example\.com/i })).toHaveAttribute(
      "href",
      "mailto:sales@example.com",
    );
    expect(screen.queryByText(MESSAGES.en.home.contact.channels.phone)).not.toBeInTheDocument();
  });

  it("shows the registered address and never invents a contact channel", async () => {
    await renderHome();

    expect(screen.getAllByText(/南宁市青秀区桂雅路/).length).toBeGreaterThan(0);
  });
});

describe.each(LOCALES)("home page (%s)", (locale) => {
  it("renders without throwing, with a single h1 and correctly-localised links", async () => {
    await renderHome(locale);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getAllByRole("link", { name: MESSAGES[locale].services["import-export"].name }),
    ).not.toHaveLength(0);
    expect(allHrefs()).toContain(`/${locale}/inquiry`);
  });
});
