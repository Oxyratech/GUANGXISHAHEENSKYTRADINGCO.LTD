// Test double for "@/server/products", shared by the page tests. Not imported by app code.
//   vi.mock("@/server/products", async () => (await import("../_lib/test-repository")).repositoryMock());
import { vi } from "vitest";
import { CATEGORY_SLUGS } from "@/content/categories";
import type { CategoryProductCounts, ProductPage, ProductSummary } from "@/server/products";

export const repository = {
  listPublishedProducts: vi.fn(),
  getPublishedProduct: vi.fn(),
  countPublishedByCategory: vi.fn(),
  getSeoOverride: vi.fn(),
};

/** Factory for vi.mock: the real constants, the controllable functions. */
export async function repositoryMock() {
  return { ...(await import("@/server/products/constants")), ...repository };
}

export function resetRepository() {
  repository.listPublishedProducts.mockReset().mockResolvedValue({ ok: true, data: emptyPage() });
  repository.getPublishedProduct.mockReset().mockResolvedValue({ ok: true, data: null });
  repository.countPublishedByCategory.mockReset().mockResolvedValue({ ok: true, data: noCounts() });
  repository.getSeoOverride.mockReset().mockResolvedValue(null);
}

export function emptyPage(): ProductPage {
  return { items: [], total: 0, page: 1, pageSize: 12, pageCount: 0 };
}

export function pageOf(items: ProductSummary[], overrides: Partial<ProductPage> = {}): ProductPage {
  return { items, total: items.length, page: 1, pageSize: 12, pageCount: 1, ...overrides };
}

export function noCounts(): CategoryProductCounts {
  return Object.fromEntries(CATEGORY_SLUGS.map((slug) => [slug, 0])) as CategoryProductCounts;
}

/** The JSON-LD objects a rendered page carries. */
export function readJsonLd(container: HTMLElement): Record<string, unknown>[] {
  return [...container.querySelectorAll('script[type="application/ld+json"]')].flatMap((script) => {
    const data = JSON.parse(script.textContent ?? "null") as unknown;
    return (Array.isArray(data) ? data : [data]) as Record<string, unknown>[];
  });
}

/** Heading levels in document order, to check that the outline never skips a level. */
export function headingLevels(container: HTMLElement): number[] {
  return [...container.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((heading) =>
    Number(heading.tagName.slice(1)),
  );
}
