import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getScopeItemsByGroup, SCOPE_GROUPS } from "@/config/business-scope";
import type { Locale } from "@/i18n/locales";
import arScope from "@/messages/ar/scope.json";
import enScope from "@/messages/en/scope.json";
import zhScope from "@/messages/zh/scope.json";
import { BusinessScopeSummary } from "./BusinessScopeSummary";
import { LOCALE_LIST, renderServer } from "./test-utils";

vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);
vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);

const SCOPE = { en: enScope, zh: zhScope, ar: arScope };

/** How each language is expected to count registered items (Arabic has singular and dual forms). */
const COUNT_LABELS: Record<Locale, (count: number) => string> = {
  en: (count) => (count === 1 ? "1 registered item" : `${count} registered items`),
  zh: (count) => `共 ${count} 项`,
  ar: (count) => {
    if (count === 1) return "بند مسجَّل واحد";
    if (count === 2) return "بندان مسجَّلان";
    return count <= 10 ? `${count} بنود مسجَّلة` : `${count} بندًا مسجَّلًا`;
  },
};

describe.each(LOCALE_LIST)("BusinessScopeSummary (%s)", (locale) => {
  it("has one tile per scope group, named and described from the scope namespace", async () => {
    await renderServer(<BusinessScopeSummary locale={locale} />, locale);
    const groups = SCOPE[locale].groups as Record<string, { name: string; description: string }>;

    expect(screen.getAllByRole("listitem")).toHaveLength(SCOPE_GROUPS.length);
    for (const group of SCOPE_GROUPS) {
      const { name = "", description = "" } = groups[group] ?? {};
      expect(screen.getByRole("heading", { level: 3, name })).toBeInTheDocument();
      expect(screen.getByText(description)).toBeInTheDocument();
    }
  });

  it("counts the registered items of each group in the grammar of the language", async () => {
    const { container } = await renderServer(<BusinessScopeSummary locale={locale} />, locale);

    const labels = [...container.querySelectorAll("li")].map(
      (tile) => tile.querySelector("p:last-child")?.textContent,
    );
    expect(labels).toEqual(
      SCOPE_GROUPS.map((group) => COUNT_LABELS[locale](getScopeItemsByGroup(group).length)),
    );
  });
});
