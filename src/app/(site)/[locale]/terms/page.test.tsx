import { render, screen } from "@testing-library/react";
import { MESSAGES } from "@/components/legal/test-utils";
import { LOCALES } from "@/i18n/locales";
import TermsRoute, { generateMetadata } from "./page";

vi.mock(
  "next-intl/server",
  async () => (await import("@/components/legal/test-utils")).intlServerMock,
);
// The page body is an async Server Component with its own tests; here only the wiring matters.
vi.mock("@/components/legal/LegalPage", () => ({
  LegalPage: ({ locale, doc }: { locale: string; doc: string }) => (
    <p data-testid="legal-page">{`${doc}:${locale}`}</p>
  ),
}));

const props = (locale: string) => ({
  params: Promise.resolve({ locale }),
  searchParams: Promise.resolve({}),
});

describe("/terms route", () => {
  it.each(LOCALES)("builds metadata from the terms messages for %s", async (locale) => {
    const { meta } = MESSAGES[locale].legal.terms;
    const metadata = await generateMetadata(props(locale));

    expect(metadata.title).toEqual({ absolute: `${meta.title} | Shaheen Sky` });
    expect(metadata.description).toBe(meta.description);
    expect(metadata.alternates?.canonical).toBe(`http://localhost:3000/${locale}/terms`);
    expect(Object.keys(metadata.alternates?.languages ?? {}).sort()).toEqual(
      ["ar", "en", "x-default", "zh-CN"].sort(),
    );
    expect(metadata.robots).toBeUndefined();
  });

  it.each(LOCALES)("renders the terms document for %s", async (locale) => {
    render(await TermsRoute(props(locale)));
    expect(screen.getByTestId("legal-page")).toHaveTextContent(`terms:${locale}`);
  });

  it("answers an unknown locale with the not-found response", async () => {
    await expect(TermsRoute(props("xx"))).rejects.toThrow();
    await expect(generateMetadata(props("xx"))).rejects.toThrow();
  });
});
