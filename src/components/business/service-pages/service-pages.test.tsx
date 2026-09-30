import { cleanup, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getScopeItem } from "@/config/business-scope";
import { SERVICE_SLUGS, SERVICES, type ServiceSlug } from "@/content/services";
import { LOCALES, type Locale } from "@/i18n/locales";
import { getAdjacentServices, getRelatedCategories } from "../service-config";
import { MESSAGES, renderServer, resetNavigation } from "../test-utils";
import { SERVICE_PAGES } from "./index";

vi.mock("@/i18n/navigation", async () => (await import("../test-utils")).navigationMock);
vi.mock("next-intl/server", async () => (await import("../test-utils")).intlServerMock);

beforeEach(() => resetNavigation("/business"));

async function renderPage(slug: ServiceSlug, locale: Locale = "en") {
  resetNavigation(`/business/${slug}`, locale);
  return renderServer(await SERVICE_PAGES[slug]({ locale }), locale);
}

const englishItems: Record<string, string> = MESSAGES.en.scope.items;

const serviceName = (slug: ServiceSlug, locale: Locale = "en") =>
  MESSAGES[locale].services[slug].name;

const headingLevels = (container: HTMLElement) =>
  [...container.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((heading) =>
    Number(heading.tagName.slice(1)),
  );

const h2Texts = () =>
  screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent ?? "");

const hrefs = (root: HTMLElement | Document = document) =>
  [...root.querySelectorAll("a")].map((link) => link.getAttribute("href"));

function jsonLd(container: HTMLElement): Record<string, unknown>[] {
  return [...container.querySelectorAll('script[type="application/ld+json"]')].flatMap((script) => {
    const parsed: unknown = JSON.parse(script.textContent ?? "null");
    return (Array.isArray(parsed) ? parsed : [parsed]) as Record<string, unknown>[];
  });
}

describe.each(SERVICE_SLUGS)("/business/%s", (slug) => {
  it("has a single h1, the line's name, and an outline that never skips a level", async () => {
    const { container } = await renderPage(slug);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(serviceName(slug));
    const levels = headingLevels(container);
    expect(levels[0]).toBe(1);
    levels.forEach((level, index) => {
      if (index > 0) expect(level).toBeLessThanOrEqual(levels[index - 1]! + 1);
    });
  });

  it("starts with a breadcrumb: Home, Business, the line as the current page", async () => {
    await renderPage(slug);

    const trail = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(trail).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/en");
    expect(within(trail).getByRole("link", { name: "Business" })).toHaveAttribute(
      "href",
      "/en/business",
    );
    expect(within(trail).getByText(serviceName(slug))).toHaveAttribute("aria-current", "page");
  });

  it("leads to the inquiry form from the hero and from the closing band", async () => {
    await renderPage(slug);

    const links = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href") === `/en/inquiry?service=${slug}`);
    expect(links.length).toBeGreaterThanOrEqual(2);
  });

  it("shows each related registered scope item with the wording of the license", async () => {
    await renderPage(slug);

    const section = screen
      .getByRole("heading", { name: "Related items in the registered business scope" })
      .closest("section");
    expect(section).not.toBeNull();
    const scope = within(section as HTMLElement);
    const service = SERVICES.find((entry) => entry.slug === slug);
    for (const id of service?.scopeItemIds ?? []) {
      const item = getScopeItem(id);
      expect(scope.getByText(englishItems[id] ?? "missing")).toBeInTheDocument();
      expect(scope.getByText(item?.zh ?? "missing")).toHaveAttribute("lang", "zh-CN");
    }
    expect(
      scope.getByText(/Except for projects that require approval under the law/),
    ).toBeInTheDocument();
  });

  it("links the related registered categories to their product pages", async () => {
    await renderPage(slug);

    for (const category of getRelatedCategories(slug)) {
      expect(hrefs()).toContain(`/en/products/${category.slug}`);
    }
    expect(screen.getByText(/They are not a list of current stock/)).toBeInTheDocument();
    expect(hrefs()).toContain("/en/products");
  });

  it("states that availability depends on the product, the supplier and the regulations", async () => {
    await renderPage(slug);

    expect(
      screen.getByRole("heading", { level: 2, name: "Availability depends on the product" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/the regulations that apply in the countries involved/),
    ).toBeInTheDocument();
  });

  it("links the neighbouring business lines and the overview", async () => {
    await renderPage(slug);

    const nav = screen.getByRole("navigation", { name: "More business lines" });
    const { previous, next } = getAdjacentServices(slug);
    const found = hrefs(nav);
    expect(found).toContain("/en/business");
    expect(found.includes(`/en/business/${previous}`)).toBe(previous !== null);
    expect(found.includes(`/en/business/${next}`)).toBe(next !== null);
  });

  it("describes itself with a breadcrumb and a Service that claims nothing beyond name, description and provider", async () => {
    const { container } = await renderPage(slug);

    const data = jsonLd(container);
    expect(data.map((entry) => entry["@type"]).sort()).toEqual(["BreadcrumbList", "Service"]);
    const service = data.find((entry) => entry["@type"] === "Service");
    expect(service?.name).toBe(serviceName(slug));
    expect(service).not.toHaveProperty("areaServed");
    expect(service).not.toHaveProperty("offers");
    const items = (data.find((entry) => entry["@type"] === "BreadcrumbList")?.itemListElement ??
      []) as { name: string }[];
    expect(items.map((item) => item.name)).toEqual(["Home", "Business", serviceName(slug)]);
  });
});

describe("six different pages", () => {
  it("gives every line sections of its own, shared by no other line", async () => {
    const perPage = new Map<ServiceSlug, string[]>();
    for (const slug of SERVICE_SLUGS) {
      await renderPage(slug);
      perPage.set(slug, h2Texts());
      cleanup();
    }

    const shared = [...(perPage.get(SERVICE_SLUGS[0]) ?? [])].filter((text) =>
      [...perPage.values()].every((texts) => texts.includes(text)),
    );
    // Registered scope, categories, availability and the call to action close every page.
    expect(shared).toEqual(
      expect.arrayContaining([
        "Related items in the registered business scope",
        "Registered categories this line can apply to",
        "Availability depends on the product",
        "Tell us what you need",
      ]),
    );

    const own = new Map(
      [...perPage].map(([slug, texts]) => [slug, texts.filter((text) => !shared.includes(text))]),
    );
    for (const [slug, texts] of own) {
      expect(texts.length, `${slug} has its own sections`).toBeGreaterThanOrEqual(2);
      for (const [other, otherTexts] of own) {
        if (other !== slug) expect(texts.filter((text) => otherTexts.includes(text))).toEqual([]);
      }
    }
  });

  it("international trading: a capability grid that links to the other lines", async () => {
    await renderPage("international-trading");

    const grid = screen
      .getByRole("heading", { name: "What international trading can cover" })
      .closest("section") as HTMLElement;
    expect(hrefs(grid)).toEqual([
      "/en/company-information",
      "/en/business/product-sourcing",
      "/en/business/supplier-coordination",
      "/en/business/business-procurement",
      "/en/business/import-export",
      "/en/business/cross-border-trade",
    ]);
  });

  it("import and export: a five-step flow, the documents involved and an information table", async () => {
    await renderPage("import-export");

    const flow = screen
      .getByRole("heading", { name: "A typical documentation and coordination flow" })
      .closest("section") as HTMLElement;
    expect(
      within(flow)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent),
    ).toEqual([
      "Confirm the goods and the route",
      "Check applicable requirements",
      "Prepare and cross-check documents",
      "Coordinate transport and customs",
      "Follow up after shipment",
      "Food and other regulated goods",
      "Documents commonly involved",
    ]);

    const table = screen.getByRole("table");
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((h) => h.textContent),
    ).toEqual(["Information", "Why it helps"]);
    expect(within(table).getAllByRole("row")).toHaveLength(6);
  });

  it("product sourcing: a brief checklist in three groups of four", async () => {
    await renderPage("product-sourcing");

    const brief = screen
      .getByRole("heading", { name: "What to tell us so we can source accurately" })
      .closest("section") as HTMLElement;
    expect(
      within(brief)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(["The product", "Quantity and terms", "Compliance and packaging"]);
    expect(within(brief).getAllByRole("listitem")).toHaveLength(12);
    expect(screen.getByRole("link", { name: "Browse the product categories" })).toHaveAttribute(
      "href",
      "/en/products",
    );
  });

  it("supplier coordination: roles and communication phrased as intentions", async () => {
    await renderPage("supplier-coordination");

    expect(
      screen
        .getAllByRole("heading", { level: 3 })
        .slice(0, 3)
        .map((h) => h.textContent),
    ).toEqual(["The buyer", "Shaheen Sky", "The supplier"]);
    expect(screen.getByText(/These are intentions, not service levels/)).toBeInTheDocument();
    const terms = [...document.querySelectorAll("dt")].map((term) => term.textContent);
    expect(terms).toEqual([
      "At the start",
      "When quotations arrive",
      "When something changes",
      "Before a decision",
    ]);
    for (const text of screen.getAllByText(/^We intend to/)) {
      expect(text.textContent).not.toMatch(/\b(always|within|hours?|days?)\b/i);
    }
  });

  it("business procurement: a five-stage workflow that links to the typical trade process", async () => {
    await renderPage("business-procurement");

    for (let step = 1; step <= 5; step += 1) {
      expect(screen.getByText(`Step ${step}`)).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "See the typical trade process" })).toHaveAttribute(
      "href",
      "/en/global-trade/how-it-works",
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "One-time or recurring" }),
    ).toBeInTheDocument();
  });

  it("cross-border trade: considerations, and answers that are in the page without JavaScript", async () => {
    const { container } = await renderPage("cross-border-trade");

    expect(
      screen
        .getAllByRole("heading", { level: 3 })
        .slice(0, 3)
        .map((h) => h.textContent),
    ).toEqual(["Lanes", "Documents", "Compliance awareness"]);

    const questions = [...container.querySelectorAll("details")];
    expect(questions).toHaveLength(4);
    expect(new Set(questions.map((details) => details.getAttribute("name")))).toEqual(
      new Set(["cb-questions"]),
    );
    expect(questions.every((details) => details.querySelector("summary h3"))).toBe(true);
    expect(screen.getByText(/The website is not an online store/)).toBeInTheDocument();
    expect(screen.getByText(/does not take orders/)).toBeInTheDocument();
  });
});

describe.each(LOCALES)("every business line in %s", (locale) => {
  it.each(SERVICE_SLUGS)("renders %s with its own name and the license wording", async (slug) => {
    // A missing message throws (see intlServerMock), so rendering is also a catalogue check.
    await renderPage(slug, locale);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(serviceName(slug, locale));
    const service = SERVICES.find((entry) => entry.slug === slug);
    for (const id of service?.scopeItemIds ?? []) {
      expect(screen.getAllByText(getScopeItem(id)?.zh ?? "missing").length).toBeGreaterThan(0);
    }
  });
});

describe("honesty of the copy", () => {
  const UNSUPPORTED: Record<Locale, RegExp> = {
    en: /\b(leading|leader|trusted|best|largest|premier|world-class|guarantee[ds]?)\b|coming soon/i,
    zh: /领先|领导者|最佳|最优|最大|最好|保证|担保|值得信赖|首屈一指|敬请期待/,
    ar: /رائد|أفضل|أكبر|نضمن|ضمان|مضمون|موثوق|قريبًا/,
  };
  // No timelines, volumes, prices or percentages: none of them exists on this site.
  const INVENTED_FIGURES =
    /\b\d+\s*(?:hours?|days?|weeks?|months?|years?|countries|suppliers|clients|customers)\b|[$€£¥￥%]|\bUSD\b|\bRMB\b|\d+\s*(?:小时|天|周|个月|年|个国家|家供应商|位客户)/i;

  it.each(LOCALES)("makes no unsupported claim and invents no figure in %s", async (locale) => {
    for (const slug of SERVICE_SLUGS) {
      await renderPage(slug, locale);
      const text = document.body.textContent ?? "";
      expect(text, `${slug} (${locale})`).not.toMatch(UNSUPPORTED[locale]);
      expect(text, `${slug} (${locale})`).not.toMatch(INVENTED_FIGURES);
      cleanup();
    }
  });
});
