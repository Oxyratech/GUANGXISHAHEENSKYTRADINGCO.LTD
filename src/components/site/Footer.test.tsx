import { screen, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { COMPANY } from "@/config/company";
import type { Locale } from "@/i18n/locales";
import type { PublicContactChannels } from "@/server/settings/contact-channels";
import { Footer } from "./Footer";
import { installDomPolyfills, renderWithIntl, resetNavigation } from "./test-utils";

vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);
vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);
vi.mock("@/lib/analytics/track", () => ({ trackEvent: vi.fn() }));

beforeAll(installDomPolyfills);
beforeEach(() => resetNavigation("/"));
afterEach(() => vi.useRealTimers());

async function renderFooter(channels: PublicContactChannels = {}, locale: Locale = "en") {
  return renderWithIntl(await Footer({ locale, channels }), locale);
}

const hrefs = () => screen.getAllByRole("link").map((link) => link.getAttribute("href") ?? "");
const linkTexts = (list: HTMLElement) =>
  within(list)
    .getAllByRole("link")
    .map((link) => link.textContent);

/** The list that follows a column heading. */
function columnOf(heading: string): HTMLElement {
  const title = screen.getByRole("heading", { name: heading });
  return title.parentElement?.querySelector("ul") as HTMLElement;
}

describe("Footer contact channels", () => {
  it("shows no email, phone or WhatsApp when none is configured", async () => {
    await renderFooter({});

    expect(hrefs().filter((href) => /^(mailto:|tel:)|wa\.me/.test(href))).toEqual([]);
    expect(screen.queryByText("Email")).not.toBeInTheDocument();
    expect(screen.queryByText("Phone")).not.toBeInTheDocument();
  });

  it("still leads visitors to the inquiry form and the contact page", async () => {
    await renderFooter({});

    const company = columnOf("Company and contact");
    expect(within(company).getByRole("link", { name: "Contact" })).toHaveAttribute(
      "href",
      "/en/contact",
    );
    expect(within(company).getByRole("link", { name: "Send inquiry" })).toHaveAttribute(
      "href",
      "/en/inquiry",
    );
  });

  it("shows exactly the channels that are configured", async () => {
    await renderFooter({ email: "sales@example.com" });

    expect(screen.getByRole("link", { name: "sales@example.com" })).toHaveAttribute(
      "href",
      "mailto:sales@example.com",
    );
    expect(screen.queryByText("Phone")).not.toBeInTheDocument();
    expect(screen.queryByText("WhatsApp")).not.toBeInTheDocument();
  });

  it("links a phone number and a WhatsApp number, WhatsApp in its own tab", async () => {
    await renderFooter({ phone: "+86 771 555 0100", whatsapp: "+86 138 0000 0000" });

    expect(screen.getByRole("link", { name: "+86 771 555 0100" })).toHaveAttribute(
      "href",
      "tel:+867715550100",
    );
    const whatsapp = screen.getByRole("link", { name: /\+86 138 0000 0000/ });
    expect(whatsapp).toHaveAttribute("href", "https://wa.me/8613800000000");
    expect(whatsapp).toHaveAttribute("target", "_blank");
    expect(whatsapp).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(whatsapp).toHaveTextContent("opens in a new tab");
  });

  it("has no social media links: no accounts exist", async () => {
    await renderFooter({ email: "sales@example.com" });

    expect(hrefs().filter((href) => /^https?:/.test(href))).toEqual([]);
  });
});

describe("Footer content", () => {
  it("shows the registered names and details verbatim, in their own language", async () => {
    await renderFooter();

    const english = screen.getAllByText(COMPANY.legalNameEn)[0];
    expect(english.closest("[lang='en']")).toHaveAttribute("dir", "ltr");
    expect(screen.getByText(COMPANY.legalNameZh)).toHaveAttribute("lang", "zh-CN");
    expect(screen.getByText(COMPANY.registeredAddressZh)).toHaveAttribute("lang", "zh-CN");
    expect(screen.getByText(COMPANY.unifiedSocialCreditCode)).toBeInTheDocument();
    expect(screen.getByText("Registered information")).toBeInTheDocument();
    expect(screen.getByText("Unified Social Credit Code")).toBeInTheDocument();
  });

  it("describes the business with the approved wording", async () => {
    await renderFooter();

    expect(
      screen.getByText(/^China-based international trading company focused on sourcing, importing/),
    ).toBeInTheDocument();
  });

  it("has the link columns of the brief", async () => {
    await renderFooter();

    for (const heading of [
      "Navigation",
      "Business",
      "Products",
      "Company and contact",
      "Legal",
      "Languages",
    ]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
    expect(linkTexts(columnOf("Legal"))).toEqual([
      "Privacy Policy",
      "Terms of Use",
      "Cookie Policy",
    ]);
    expect(
      within(columnOf("Legal"))
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/en/privacy-policy", "/en/terms", "/en/cookies"]);
  });

  it("lists the six business lines and the twelve categories", async () => {
    await renderFooter();

    expect(linkTexts(columnOf("Business"))).toEqual([
      "International Trading",
      "Import & Export",
      "Product Sourcing",
      "Supplier Coordination",
      "Business Procurement",
      "Cross-Border Trade",
    ]);
    const products = within(columnOf("Products")).getAllByRole("link");
    expect(products).toHaveLength(13);
    expect(products[0]).toHaveTextContent("All products");
    expect(products.slice(1).map((link) => link.getAttribute("href"))).toEqual(
      expect.arrayContaining(["/en/products/food-products", "/en/products/minerals-ores"]),
    );
  });

  it("offers the three languages, marking the current one", async () => {
    await renderFooter({}, "zh");

    const languages = screen.getByRole("list", { name: "语言" });
    expect(linkTexts(languages)).toEqual(["English", "简体中文", "العربية"]);
    expect(within(languages).getByRole("link", { name: "简体中文" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("is the page's content-info landmark with a labelled navigation inside", async () => {
    await renderFooter();

    const footer = screen.getByRole("contentinfo");
    expect(
      within(footer).getByRole("navigation", { name: "Footer navigation" }),
    ).toBeInTheDocument();
  });

  it("prints the copyright with the company's registered name", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-30T12:00:00Z"));
    await renderFooter();

    const line = screen.getByText(/All rights reserved\./).closest("p") as HTMLElement;
    expect(line).toHaveTextContent(`© 2026 ${COMPANY.legalNameEn} All rights reserved.`);
  });

  it("shows a range of years once the company is older than its founding year", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2028-02-01T12:00:00Z"));
    await renderFooter();

    expect(screen.getByText("2026–2028")).toBeInTheDocument();
  });

  it("shows the tagline", async () => {
    await renderFooter();

    expect(screen.getByText("Connecting Global Markets Through Trade")).toBeInTheDocument();
  });
});

describe("Footer in other languages", () => {
  it("is fully Chinese in Chinese, with the registered names untouched", async () => {
    await renderFooter({}, "zh");

    expect(screen.getByRole("heading", { name: "注册信息" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "公司与联系" })).toBeInTheDocument();
    expect(screen.getByText("国际贸易")).toBeInTheDocument();
    expect(screen.getByText(COMPANY.legalNameZh)).toBeInTheDocument();
    expect(screen.getAllByText(COMPANY.legalNameEn).length).toBeGreaterThan(0);
  });

  it("isolates Latin names and numbers inside Arabic text so they do not reorder", async () => {
    await renderFooter({ phone: "+86 771 555 0100" }, "ar");

    expect(screen.getByRole("heading", { name: "بيانات التسجيل" })).toBeInTheDocument();
    for (const value of [COMPANY.unifiedSocialCreditCode, "+86 771 555 0100"]) {
      expect(screen.getByText(value).closest("bdi")).toHaveAttribute("dir", "ltr");
    }
    for (const node of screen.getAllByText(COMPANY.legalNameEn)) {
      expect(node.closest("bdi")).toHaveAttribute("dir", "ltr");
      expect(node.closest("bdi")).toHaveAttribute("lang", "en");
    }
    expect(screen.getByText(COMPANY.registeredAddressZh)).toHaveAttribute("lang", "zh-CN");
  });

  it("links every footer page in the visitor's language", async () => {
    await renderFooter({}, "ar");

    const internal = hrefs().filter((href) => href.startsWith("/"));
    expect(internal.length).toBeGreaterThan(30);
    expect(internal.every((href) => /^\/(ar|en|zh)(\/|$)/.test(href))).toBe(true);
    expect(within(columnOf("المنتجات")).getAllByRole("link")[1]).toHaveAttribute(
      "href",
      "/ar/products/consumer-goods",
    );
  });
});
