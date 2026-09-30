import { render, screen, within } from "@testing-library/react";
import { COMPANY } from "@/config/company";
import { LOCALES, type Locale } from "@/i18n/locales";
import { COOKIES } from "./cookie-inventory";
import { LegalPage } from "./LegalPage";
import { LEGAL_DOCS, type LegalDocKey } from "./legal-outline";
import { current, MESSAGES } from "./test-utils";

vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);
vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);

const DOCS = Object.keys(LEGAL_DOCS) as LegalDocKey[];

async function renderLegal(locale: Locale, doc: LegalDocKey) {
  current.locale = locale;
  return render(await LegalPage({ locale, doc }));
}

function structuredData(container: HTMLElement): Record<string, unknown>[] {
  return [...container.querySelectorAll('script[type="application/ld+json"]')].flatMap((script) => {
    const parsed: unknown = JSON.parse(script.textContent ?? "null");
    return (Array.isArray(parsed) ? parsed : [parsed]) as Record<string, unknown>[];
  });
}

describe.each(LOCALES)("LegalPage (%s)", (locale) => {
  const messages = MESSAGES[locale];

  describe.each(DOCS)("%s", (doc) => {
    it("has the page's single h1 and a breadcrumb that ends at the page", async () => {
      await renderLegal(locale, doc);
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        messages.legal[doc].hero.title,
      );

      const trail = screen.getByRole("navigation", { name: messages.common.a11y.breadcrumb });
      expect(
        within(trail).getByRole("link", { name: messages.common.breadcrumb.home }),
      ).toHaveAttribute("href", `/${locale}`);
      expect(within(trail).getByText(messages.common.nav[doc])).toHaveAttribute(
        "aria-current",
        "page",
      );
    });

    it("begins with the visible legal review status notice", async () => {
      const { container } = await renderLegal(locale, doc);
      const notice = screen.getByRole("note");

      expect(notice).toBeVisible();
      expect(notice).toHaveTextContent(messages.legal.review.title);
      expect(notice).toHaveTextContent(messages.legal.review.body);
      // It comes before the first section of legal text.
      const firstHeading = container.querySelector("h2");
      expect(
        notice.compareDocumentPosition(firstHeading as Node) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("shows the last-updated date from the legal messages", async () => {
      await renderLegal(locale, doc);
      const time = document.querySelector("time");
      expect(time).toHaveAttribute("datetime", messages.legal.updated[doc]);
      expect(time?.textContent).toMatch(/2026/);
    });

    it("leaves no TODO in the text but does keep the bracketed placeholders", async () => {
      const { container } = await renderLegal(locale, doc);
      const article = container.querySelector("[data-legal-document]");
      expect(article?.textContent).not.toMatch(/\b(TODO|TBD|FIXME|lorem)\b/i);

      const placeholders = [...container.querySelectorAll("mark[data-legal-placeholder]")];
      expect(placeholders.length).toBeGreaterThan(0);
      for (const placeholder of placeholders) {
        expect(placeholder.textContent).toMatch(/^\[.+\]$/);
      }
    });

    it("resolves every table-of-contents link to its section heading", async () => {
      const { container } = await renderLegal(locale, doc);
      const toc = screen.getByRole("navigation", { name: messages.legal.labels.toc });
      const links = within(toc).getAllByRole("link");
      const headings = [...container.querySelectorAll("h2")];

      expect(links).toHaveLength(headings.length);
      expect(links.length).toBeGreaterThanOrEqual(5);
      for (const link of links) {
        const target = document.getElementById(link.getAttribute("href")?.slice(1) ?? "");
        expect(target, link.textContent ?? "").not.toBeNull();
        expect(target?.textContent).toBe(link.textContent);
      }
      // Ids are unique, or an anchor could land on the wrong section.
      expect(new Set(headings.map((h) => h.id)).size).toBe(headings.length);
    });

    it("adds the breadcrumb structured data", async () => {
      const { container } = await renderLegal(locale, doc);
      const trail = structuredData(container).find((data) => data["@type"] === "BreadcrumbList");
      const items = trail?.itemListElement as { name: string; item: string }[];

      expect(items.map((item) => item.item)).toEqual([
        `http://localhost:3000/${locale}`,
        `http://localhost:3000/${locale}${LEGAL_DOCS[doc].path}`,
      ]);
      expect(items.map((item) => item.name)).toEqual([
        messages.common.breadcrumb.home,
        messages.common.nav[doc],
      ]);
    });

    it("offers printing", async () => {
      await renderLegal(locale, doc);
      expect(screen.getByRole("button", { name: messages.legal.labels.print })).toBeInTheDocument();
    });
  });

  it("names the company as the controller with its registered names and address", async () => {
    const { container } = await renderLegal(locale, "privacy");
    const controller = container.querySelector("#controller")?.parentElement;

    expect(controller).toHaveTextContent(COMPANY.legalNameEn);
    expect(controller).toHaveTextContent(COMPANY.legalNameZh);
    expect(controller).toHaveTextContent(COMPANY.registeredAddressZh);
    // Chinese registered details keep their own language so they are read and shaped correctly.
    expect(
      [...(controller?.querySelectorAll('bdi[lang="zh-CN"]') ?? [])].map((el) => el.textContent),
    ).toEqual([COMPANY.legalNameZh, COMPANY.registeredAddressZh]);
    expect(controller?.querySelector('bdi[lang="en"][dir="ltr"]')).toHaveTextContent(
      COMPANY.legalNameEn,
    );
  });

  it("states that an inquiry is not an offer or a contract, in the terms", async () => {
    const { container } = await renderLegal(locale, "terms");
    const section = container.querySelector("#inquiries")?.parentElement;
    const { inquiries } = messages.legal.terms.sections;
    expect(section).toHaveTextContent(inquiries.title);
    expect(section?.querySelectorAll("p")).toHaveLength(2);
  });

  it("lists every cookie of the inventory in a table on the cookie page", async () => {
    await renderLegal(locale, "cookies");
    const table = screen.getByRole("table", { name: messages.legal.cookies.table.caption });
    const rowHeaders = within(table)
      .getAllByRole("rowheader")
      .map((header) => header.textContent);

    expect(rowHeaders).toEqual(COOKIES.map((cookie) => cookie.name));
    expect(within(table).getAllByRole("row")).toHaveLength(COOKIES.length + 1);
    for (const { id } of COOKIES) {
      expect(table).toHaveTextContent(messages.legal.cookies.table.rows[id].setFor);
    }
  });

  it("shows no cookie table on the other pages", async () => {
    await renderLegal(locale, "privacy");
    expect(screen.queryByRole("table")).toBeNull();
  });
});
