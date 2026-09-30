import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/toast";
import { DatabaseUnavailableError } from "@/server/db/errors";
import type { Permission } from "@/server/auth/permissions";
import type { AuthSession } from "@/server/auth/session";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn(),
  getProductForEdit: vi.fn(),
}));

class RedirectSignal extends Error {}

vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/ui/test-utils")).navigationMock,
);
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/admin/products/p1",
}));
vi.mock("@/server/auth/session", () => ({ getSession: mocks.getSession }));
vi.mock("@/server/admin/products/detail", () => ({ getProductForEdit: mocks.getProductForEdit }));
vi.mock("@/server/admin/products/actions", () => ({
  updateProductCore: vi.fn(),
  upsertProductTranslation: vi.fn(),
  changeProductStatus: vi.fn(),
  deleteProduct: vi.fn(),
}));
vi.mock("@/server/admin/products/image-actions", () => ({
  uploadProductImage: vi.fn(),
  setPrimaryProductImage: vi.fn(),
  moveProductImage: vi.fn(),
  removeProductImage: vi.fn(),
  updateProductImageTranslation: vi.fn(),
}));
vi.mock("@/server/admin/products/document-actions", () => ({
  uploadProductDocument: vi.fn(),
  moveProductDocument: vi.fn(),
  removeProductDocument: vi.fn(),
  setProductDocumentKind: vi.fn(),
  updateProductDocumentTranslation: vi.fn(),
}));
vi.mock("@/server/admin/products/specification-actions", () => ({
  addProductSpecification: vi.fn(),
  moveProductSpecification: vi.fn(),
  removeProductSpecification: vi.fn(),
  updateProductSpecificationTranslation: vi.fn(),
}));
vi.mock("@/server/storage", () => ({
  describeUploadPolicy: () => ({
    maxBytes: 5_000_000,
    mimeTypes: ["image/jpeg"],
    extensions: ["jpg"],
  }),
  PRODUCT_IMAGE: { name: "PRODUCT_IMAGE" },
  PUBLIC_DOCUMENT: { name: "PUBLIC_DOCUMENT" },
}));

import ProductEditPage from "./page";

function makeSession(...permissions: Permission[]): AuthSession {
  return {
    sessionId: "s1",
    user: { id: "u1", email: "staff@example.com", name: "Staff" },
    roles: ["CONTENT_MANAGER"],
    permissions: new Set(permissions),
  };
}

function baseProduct(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "0d4f2c1a-0000-4000-8000-00000000000a",
    slug: "steel-wire-mesh",
    categorySlug: "hardware-products",
    status: "DRAFT",
    origin: "Guangxi",
    sortOrder: 0,
    featured: false,
    publishedAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-06-01T00:00:00Z"),
    version: 1,
    translations: [
      {
        locale: "en",
        name: "Steel Wire Mesh",
        shortDescription: "Woven mesh.",
        description: null,
        applications: null,
        packagingInfo: null,
      },
    ],
    images: [],
    documents: [],
    specifications: [],
    ...overrides,
  };
}

async function renderPage(id = "0d4f2c1a-0000-4000-8000-00000000000a") {
  const page = await ProductEditPage({
    params: Promise.resolve({ id }),
    searchParams: Promise.resolve({}),
  });
  render(
    <Toaster viewportLabel="Notifications" closeLabel="Close">
      {page}
    </Toaster>,
  );
}

beforeEach(() => {
  mocks.getSession
    .mockReset()
    .mockResolvedValue(
      makeSession("product:read", "product:write", "product:publish", "product:delete"),
    );
  mocks.redirect.mockReset().mockImplementation((path: string) => {
    throw new RedirectSignal(path);
  });
  mocks.getProductForEdit.mockReset();
});

describe("access", () => {
  it("shows the 403 panel to a user without product:read", async () => {
    mocks.getSession.mockResolvedValue(makeSession("inquiry:read"));
    await renderPage();
    expect(
      screen.getByRole("heading", { name: "You do not have access to this page" }),
    ).toBeInTheDocument();
    expect(mocks.getProductForEdit).not.toHaveBeenCalled();
  });

  it("shows the outage panel when the database cannot be reached", async () => {
    mocks.getProductForEdit.mockRejectedValue(
      new DatabaseUnavailableError("down", { cause: "connection" }),
    );
    await renderPage();
    expect(
      screen.getByRole("heading", { name: "The database could not be reached" }),
    ).toBeInTheDocument();
  });

  it("shows the not-found panel when the product does not exist", async () => {
    mocks.getProductForEdit.mockResolvedValue(null);
    await renderPage();
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  });
});

describe("with data", () => {
  it("shows the English name as the title, the slug, and the status", async () => {
    mocks.getProductForEdit.mockResolvedValue(baseProduct());
    await renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Steel Wire Mesh" })).toBeInTheDocument();
    expect(screen.getAllByText("steel-wire-mesh").length).toBeGreaterThan(0);
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("falls back to the slug as the title when there is no English name yet", async () => {
    mocks.getProductForEdit.mockResolvedValue(baseProduct({ translations: [] }));
    await renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "steel-wire-mesh" })).toBeInTheDocument();
  });

  it("offers Publish for a draft and Unpublish for a published product", async () => {
    mocks.getProductForEdit.mockResolvedValue(baseProduct({ status: "DRAFT" }));
    await renderPage();
    expect(screen.getByRole("button", { name: "Publish" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Unpublish" })).not.toBeInTheDocument();
  });

  it("hides the core-fields editor and the tabs from a user without product:write", async () => {
    mocks.getSession.mockResolvedValue(makeSession("product:read"));
    mocks.getProductForEdit.mockResolvedValue(baseProduct());
    await renderPage();
    expect(screen.queryByRole("heading", { name: "Core fields" })).not.toBeInTheDocument();
    expect(
      screen.getByText("You do not have permission to edit this product's content."),
    ).toBeInTheDocument();
  });
});
