import { render, screen } from "@testing-library/react";
import { MESSAGES } from "@/components/faq/test-utils";
import { LOCALES } from "@/i18n/locales";
import FaqRoute, { generateMetadata } from "./page";

vi.mock(
  "next-intl/server",
  async () => (await import("@/components/faq/test-utils")).intlServerMock,
);
// The page body is an async Server Component with its own tests; here only the wiring matters.
vi.mock("@/components/faq/FaqPage", () => ({
  FaqPage: ({ locale }: { locale: string }) => <p data-testid="faq-page">{locale}</p>,
}));

const props = (locale: string) => ({
  params: Promise.resolve({ locale }),
  searchParams: Promise.resolve({}),
});

describe("/faq route", () => {
  it.each(LOCALES)("builds metadata from the faq messages for %s", async (locale) => {
    const { meta } = MESSAGES[locale].faq;
    const metadata = await generateMetadata(props(locale));

    expect(metadata.title).toEqual({ absolute: `${meta.title} | Shaheen Sky` });
    expect(metadata.description).toBe(meta.description);
    expect(metadata.alternates?.canonical).toBe(`http://localhost:3000/${locale}/faq`);
    expect(Object.keys(metadata.alternates?.languages ?? {}).sort()).toEqual(
      ["ar", "en", "x-default", "zh-CN"].sort(),
    );
    expect(metadata.robots).toBeUndefined();
  });

  it.each(LOCALES)("renders the FAQ page body for %s", async (locale) => {
    render(await FaqRoute(props(locale)));
    expect(screen.getByTestId("faq-page")).toHaveTextContent(locale);
  });

  it("answers an unknown locale with the not-found response", async () => {
    await expect(FaqRoute(props("xx"))).rejects.toThrow();
    await expect(generateMetadata(props("xx"))).rejects.toThrow();
  });
});
