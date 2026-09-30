import { render } from "@testing-library/react";
import { COMPANY } from "@/config/company";
import { LOCALES } from "@/i18n/locales";
import { buildLegalSections, type LegalSection } from "./legal-content";
import { LEGAL_DOCS, type LegalDocKey } from "./legal-outline";
import { current, MESSAGES } from "./test-utils";

vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);
vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);

const DOCS = Object.keys(LEGAL_DOCS) as LegalDocKey[];

const renderSections = (sections: readonly LegalSection[]) =>
  render(
    <div>
      {sections.map((section) => (
        <section key={section.id}>{section.content}</section>
      ))}
    </div>,
  );

afterEach(() => {
  vi.restoreAllMocks();
});

describe.each(LOCALES)("buildLegalSections (%s)", (locale) => {
  beforeEach(() => {
    current.locale = locale;
  });

  it.each(DOCS)("builds every %s section, in the order of the messages", async (doc) => {
    const sections = await buildLegalSections(locale, doc);
    const source = MESSAGES[locale].legal[doc].sections as Record<string, { title: string }>;

    expect(sections.map((section) => section.id)).toEqual(Object.keys(source));
    expect(sections.map((section) => section.title)).toEqual(
      Object.values(source).map((section) => section.title),
    );
    expect(sections.length).toBeGreaterThanOrEqual(5);
  });

  it.each(DOCS)("formats every %s message without an error", async (doc) => {
    const onError = vi.spyOn(console, "error").mockImplementation(() => {});
    const sections = await buildLegalSections(locale, doc);
    const { container } = renderSections(sections);

    expect(onError).not.toHaveBeenCalled();
    expect(container.textContent).not.toMatch(/[<>{}]/);
    // A message that failed to format would show its key instead of its text.
    expect(container.textContent).not.toMatch(/\w+__\w+/);
  });

  it("renders a string as a paragraph and an object as a bulleted list", async () => {
    const sections = await buildLegalSections(locale, "privacy");
    const collected = sections.find((section) => section.id === "collected");
    const { container } = render(<div>{collected?.content}</div>);
    const blocks = [...(container.firstElementChild?.children ?? [])].map((el) => el.tagName);

    expect(container.querySelectorAll("ul")).toHaveLength(3);
    expect(container.querySelectorAll("ul > li").length).toBeGreaterThanOrEqual(10);
    // The page follows the order of the messages: a paragraph, then each lead-in with its list.
    expect(blocks).toEqual(["P", "P", "UL", "P", "UL", "P", "UL", "P", "P"]);
  });

  it("names the company by its registered details, in their own language", async () => {
    const sections = await buildLegalSections(locale, "privacy");
    const controller = sections.find((section) => section.id === "controller");
    const { container } = render(<div>{controller?.content}</div>);

    expect(container.querySelector('bdi[lang="en"]')).toHaveTextContent(COMPANY.legalNameEn);
    const chinese = [...container.querySelectorAll('bdi[lang="zh-CN"]')].map(
      (el) => el.textContent,
    );
    expect(chinese).toEqual([COMPANY.legalNameZh, COMPANY.registeredAddressZh]);
  });

  it("marks every placeholder, and each one keeps its square brackets", async () => {
    for (const doc of DOCS) {
      const sections = await buildLegalSections(locale, doc);
      const { container, unmount } = renderSections(sections);
      const marks = [...container.querySelectorAll("mark[data-legal-placeholder]")];

      expect(marks.length, doc).toBeGreaterThan(0);
      for (const mark of marks) expect(mark.textContent, doc).toMatch(/^\[[^\]]+\]$/);
      unmount();
    }
  });

  it("links to real pages, locale-prefixed", async () => {
    const sections = await buildLegalSections(locale, "privacy");
    const { container } = renderSections(sections);
    const hrefs = new Set([...container.querySelectorAll("a")].map((a) => a.getAttribute("href")));

    expect(hrefs).toEqual(
      new Set([
        `/${locale}/contact`,
        `/${locale}/cookies`,
        `/${locale}/terms`,
        `/${locale}/company-information`,
      ]),
    );
  });
});

describe("buildLegalSections extras", () => {
  it("adds a component at the end of the section it is meant for", async () => {
    current.locale = "en";
    const sections = await buildLegalSections("en", "cookies", { used: <table data-extra /> });
    const used = sections.find((section) => section.id === "used");
    const { container } = render(<div>{used?.content}</div>);

    expect(container.firstElementChild?.lastElementChild).toHaveAttribute("data-extra");
    const others = sections.filter((section) => section.id !== "used");
    for (const section of others) {
      expect(
        render(<div>{section.content}</div>).container.querySelector("[data-extra]"),
      ).toBeNull();
    }
  });

  it("refuses content for a section that does not exist, so a rename cannot drop it silently", async () => {
    current.locale = "en";
    await expect(buildLegalSections("en", "cookies", { missing: <p /> })).rejects.toThrow(
      /no section "missing"/,
    );
  });
});
