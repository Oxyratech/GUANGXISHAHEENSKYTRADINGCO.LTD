import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LOCALES, type Locale } from "@/i18n/locales";
import { FaqPage } from "./FaqPage";
import { FAQ_GROUPS } from "./faq-outline";
import { current, MESSAGES } from "./test-utils";

vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);
vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);

const itemIds = FAQ_GROUPS.flatMap((group) => group.items);

async function renderPage(locale: Locale) {
  current.locale = locale;
  return render(await FaqPage({ locale }));
}

function structuredData(container: HTMLElement): Record<string, unknown>[] {
  return [...container.querySelectorAll('script[type="application/ld+json"]')].flatMap((script) => {
    const parsed: unknown = JSON.parse(script.textContent ?? "null");
    return (Array.isArray(parsed) ? parsed : [parsed]) as Record<string, unknown>[];
  });
}

describe.each(LOCALES)("FaqPage (%s)", (locale) => {
  const messages = MESSAGES[locale];

  it("has one h1, a group heading for each of the four groups and a question heading for each item", async () => {
    await renderPage(locale);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(messages.faq.hero.title);

    const groupHeadings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);
    for (const group of FAQ_GROUPS) {
      expect(groupHeadings).toContain(messages.faq.groups[group.id]);
    }

    const questions = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(questions).toEqual(itemIds.map((id) => messages.faq.items[id].question));
    expect(questions.length).toBeGreaterThanOrEqual(12);
  });

  it("renders every question inside its own group, in order", async () => {
    await renderPage(locale);
    for (const group of FAQ_GROUPS) {
      const section = screen.getByRole("region", { name: messages.faq.groups[group.id] });
      const asked = within(section)
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent);
      expect(asked).toEqual(group.items.map((id) => messages.faq.items[id].question));
    }
  });

  it("points every topic link at a group that exists", async () => {
    const { container } = await renderPage(locale);
    const nav = screen.getByRole("navigation", { name: messages.faq.nav.label });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(FAQ_GROUPS.length);
    for (const link of links) {
      const target = link.getAttribute("href")?.slice(1) ?? "";
      expect(container.querySelector(`section#${target}`), target).not.toBeNull();
    }
  });

  it("marks up FAQPage from the visible questions and the same answers", async () => {
    const user = userEvent.setup();
    const { container } = await renderPage(locale);
    const faqPage = structuredData(container).find((data) => data["@type"] === "FAQPage");
    expect(faqPage).toBeDefined();

    const entities = faqPage?.mainEntity as {
      "@type": string;
      name: string;
      acceptedAnswer: { "@type": string; text: string };
    }[];
    expect(entities).toHaveLength(itemIds.length);

    const visibleQuestions = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(entities.map((entity) => entity.name)).toEqual(visibleQuestions);

    // The accordion only renders an answer once its question is open, so open each one in turn
    // (closing the last, since the accordion allows only one at a time) to compare it.
    for (const [index, entity] of entities.entries()) {
      expect(entity["@type"]).toBe("Question");
      expect(entity.acceptedAnswer["@type"]).toBe("Answer");
      const id = itemIds[index] ?? "";
      await user.click(screen.getByRole("button", { name: entity.name }));
      const visibleAnswer = container.querySelector(`#${id} [role="region"]`)?.textContent;
      expect(visibleAnswer).toBe(entity.acceptedAnswer.text);
    }
  });

  it("adds the breadcrumb trail to the structured data", async () => {
    const { container } = await renderPage(locale);
    const trail = structuredData(container).find((data) => data["@type"] === "BreadcrumbList");
    const items = trail?.itemListElement as { position: number; item: string }[];
    expect(items.map((item) => item.item)).toEqual([
      `http://localhost:3000/${locale}`,
      `http://localhost:3000/${locale}/faq`,
    ]);
  });

  it("ends with a call to action that leads to the inquiry and contact pages", async () => {
    await renderPage(locale);
    const cta = screen.getByRole("region", { name: messages.faq.cta.title });
    expect(within(cta).getByRole("link", { name: messages.faq.cta.primary })).toHaveAttribute(
      "href",
      `/${locale}/inquiry`,
    );
    expect(within(cta).getByRole("link", { name: messages.faq.cta.secondary })).toHaveAttribute(
      "href",
      `/${locale}/contact`,
    );
  });

  it("opens the question a link names", async () => {
    window.history.replaceState(null, "", "/faq#attachments");
    await renderPage(locale);
    const button = screen.getByRole("button", {
      name: messages.faq.items.attachments.question,
    });
    expect(button).toHaveAttribute("aria-expanded", "true");
    window.history.replaceState(null, "", "/");
  });

  it("reveals an answer and its link when a question is opened", async () => {
    const user = userEvent.setup();
    await renderPage(locale);
    await user.click(screen.getByRole("button", { name: messages.faq.items.submit.question }));
    const answer = screen.getByRole("region", { name: messages.faq.items.submit.question });
    expect(within(answer).getByRole("link")).toHaveAttribute("href", `/${locale}/inquiry`);
  });
});
