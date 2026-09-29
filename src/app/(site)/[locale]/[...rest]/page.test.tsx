import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  setRequestLocale: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("next-intl/server", () => ({ setRequestLocale: mocks.setRequestLocale }));

import UnknownPage from "./page";

beforeEach(() => {
  mocks.notFound.mockClear();
  mocks.setRequestLocale.mockClear();
});

describe("catch-all page", () => {
  it.each(["en", "zh", "ar"])(
    "renders the localised 404 for an unknown path under %s",
    async (locale) => {
      await expect(
        UnknownPage({ params: Promise.resolve({ locale, rest: ["no", "such", "page"] }) }),
      ).rejects.toThrow("NEXT_NOT_FOUND");

      expect(mocks.setRequestLocale).toHaveBeenCalledWith(locale);
      expect(mocks.notFound).toHaveBeenCalledTimes(1);
    },
  );

  it("is a 404 as well when the locale itself is unknown", async () => {
    await expect(
      UnknownPage({ params: Promise.resolve({ locale: "xx", rest: ["about"] }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mocks.setRequestLocale).not.toHaveBeenCalled();
  });
});
