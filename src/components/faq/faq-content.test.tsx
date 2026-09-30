import { render } from "@testing-library/react";
import { CATEGORIES } from "@/content/categories";
import { LOCALES, type Locale } from "@/i18n/locales";
import { getFaqContent } from "./faq-content";
import { FAQ_GROUPS } from "./faq-outline";
import { current, MESSAGES } from "./test-utils";

vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);
vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);

const itemIds = FAQ_GROUPS.flatMap((group) => group.items);

function textOf(node: React.ReactNode): string {
  const { container } = render(<div>{node}</div>);
  return container.textContent ?? "";
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe.each(LOCALES)("getFaqContent (%s)", (locale: Locale) => {
  beforeEach(() => {
    current.locale = locale;
  });

  it("builds the outline's groups and questions from the messages", async () => {
    const { groups } = await getFaqContent(locale);
    const messages = MESSAGES[locale].faq;

    expect(groups.map((group) => group.id)).toEqual(FAQ_GROUPS.map((group) => group.id));
    expect(groups.map((group) => group.anchorId)).toEqual(
      FAQ_GROUPS.map((group) => `group-${group.id}`),
    );
    for (const group of groups) {
      expect(group.title).toBe(messages.groups[group.id as keyof typeof messages.groups]);
      expect(group.items.map((item) => item.id)).toEqual(
        FAQ_GROUPS.find((definition) => definition.id === group.id)?.items,
      );
    }
    expect(groups.flatMap((group) => group.items.map((item) => item.question))).toEqual(
      itemIds.map((id) => messages.items[id].question),
    );
  });

  it("gives the structured data the same questions as the page, and the same answers as plain text", async () => {
    const { groups, entries } = await getFaqContent(locale);
    const items = groups.flatMap((group) => group.items);

    expect(entries.map((entry) => entry.question)).toEqual(items.map((item) => item.question));
    entries.forEach((entry, index) => {
      expect(entry.answer).toBe(textOf(items[index]?.answer));
    });
  });

  it("formats every message without an error: no unknown tag, no missing argument", async () => {
    const onError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { groups, entries } = await getFaqContent(locale);
    groups.forEach((group) => group.items.forEach((item) => textOf(item.answer)));

    expect(onError).not.toHaveBeenCalled();
    for (const entry of entries) {
      expect(entry.answer).not.toMatch(/[<>{}]/);
      expect(entry.answer).not.toMatch(/^items\./);
    }
  });

  it("links answers to real pages, locale-prefixed", async () => {
    const { groups } = await getFaqContent(locale);
    const answer = (id: string) =>
      render(<div>{groups.flatMap((g) => g.items).find((item) => item.id === id)?.answer}</div>);

    const hrefs = (id: string) =>
      [...answer(id).container.querySelectorAll("a")].map((a) => a.getAttribute("href"));

    expect(hrefs("registered")).toEqual([`/${locale}/company-information`]);
    expect(hrefs("submit")).toEqual([`/${locale}/inquiry`]);
    expect(hrefs("process")).toEqual([`/${locale}/global-trade/how-it-works`]);
    expect(hrefs("categories")).toEqual([`/${locale}/company-information`, `/${locale}/products`]);
    expect(hrefs("contact").sort()).toEqual([`/${locale}/contact`, `/${locale}/inquiry`].sort());
  });

  it("reads the category count and the registered names from the company registry", async () => {
    const { groups, entries } = await getFaqContent(locale);
    const categories = entries[itemIds.indexOf("categories")]?.answer ?? "";
    expect(categories).toContain(String(CATEGORIES.length));

    const registered = groups
      .flatMap((group) => group.items)
      .find((item) => item.id === "registered");
    const { container } = render(<div>{registered?.answer}</div>);
    expect(container.querySelector('bdi[lang="en"]')).toHaveTextContent(
      "GUANGXI SHAHEEN SKY TRADING CO., LTD.",
    );
    expect(container.querySelector('bdi[lang="zh-CN"]')).toHaveTextContent(
      "广西沙欣斯凯商贸有限责任公司",
    );
  });
});
