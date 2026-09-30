// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession } from "@/server/auth/session";

const mocks = vi.hoisted(() => {
  const db = {
    product: { findUnique: vi.fn() },
    productSpecification: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    productSpecificationTranslation: { upsert: vi.fn() },
    $transaction: vi.fn(),
  };
  return {
    db,
    getDb: vi.fn(() => db),
    requirePermissionOrThrow: vi.fn(),
    writeAudit: vi.fn(),
    getRequestContext: vi.fn(),
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
  };
});

class RedirectSignal extends Error {}

vi.mock("next/navigation", () => ({
  unstable_rethrow: (error: unknown) => {
    if (error instanceof RedirectSignal) throw error;
  },
}));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
  revalidateTag: mocks.revalidateTag,
}));
vi.mock("@/server/auth/authorize", () => {
  class AuthenticationError extends Error {}
  class AuthorizationError extends Error {}
  return {
    AuthenticationError,
    AuthorizationError,
    requirePermissionOrThrow: mocks.requirePermissionOrThrow,
  };
});
vi.mock("@/server/audit", () => ({ writeAudit: mocks.writeAudit }));
vi.mock("@/server/http/request-context", () => ({ getRequestContext: mocks.getRequestContext }));
vi.mock("@/server/db", () => ({ getDb: mocks.getDb }));

import { AuthorizationError } from "@/server/auth/authorize";
import {
  addProductSpecification,
  moveProductSpecification,
  removeProductSpecification,
  updateProductSpecificationTranslation,
} from "./specification-actions";
import { MAX_PRODUCT_SPECIFICATIONS } from "./schemas";

const IP_HASH = "a".repeat(64);
const PRODUCT_ID = "11111111-1111-1111-1111-111111111111";
const SPEC_A = "22222222-2222-2222-2222-222222222222";
const SPEC_B = "33333333-3333-3333-3333-333333333333";

const session: AuthSession = {
  sessionId: "s1",
  user: { id: "staff-1", email: "staff@example.com", name: "Staff" },
  roles: ["CONTENT_MANAGER"],
  permissions: new Set(["product:write"]),
};

beforeEach(() => {
  mocks.getDb.mockReset().mockReturnValue(mocks.db);
  mocks.db.product.findUnique
    .mockReset()
    .mockResolvedValue({ slug: "steel-wire-mesh", categorySlug: "hardware-products" });
  mocks.db.productSpecification.count.mockReset().mockResolvedValue(0);
  mocks.db.productSpecification.create.mockReset();
  mocks.db.productSpecification.findFirst.mockReset();
  mocks.db.productSpecification.findMany.mockReset().mockResolvedValue([]);
  mocks.db.productSpecification.update.mockReset();
  mocks.db.productSpecification.delete.mockReset();
  mocks.db.productSpecificationTranslation.upsert.mockReset().mockResolvedValue({});
  mocks.db.$transaction.mockReset().mockImplementation((arg: unknown) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    return (arg as (tx: typeof mocks.db) => unknown)(mocks.db);
  });
  mocks.requirePermissionOrThrow.mockReset().mockResolvedValue(session);
  mocks.writeAudit.mockReset().mockResolvedValue(undefined);
  mocks.revalidatePath.mockReset();
  mocks.revalidateTag.mockReset();
  mocks.getRequestContext
    .mockReset()
    .mockResolvedValue({ ip: "203.0.113.9", ipHash: IP_HASH, userAgent: "UA", origin: null });
});

describe("addProductSpecification", () => {
  it("requires product:write", async () => {
    mocks.requirePermissionOrThrow.mockRejectedValue(new AuthorizationError("product:write"));
    const state = await addProductSpecification({ productId: PRODUCT_ID });
    expect(state).toMatchObject({ code: "forbidden" });
    expect(mocks.db.productSpecification.create).not.toHaveBeenCalled();
  });

  it("refuses at the specification-row limit", async () => {
    mocks.db.productSpecification.count.mockResolvedValue(MAX_PRODUCT_SPECIFICATIONS);
    const state = await addProductSpecification({ productId: PRODUCT_ID });
    expect(state).toMatchObject({ status: "error" });
    expect(mocks.db.productSpecification.create).not.toHaveBeenCalled();
  });

  it("adds a blank row at the end", async () => {
    mocks.db.productSpecification.count.mockResolvedValue(2);
    mocks.db.productSpecification.create.mockResolvedValue({ id: SPEC_A });

    const state = await addProductSpecification({ productId: PRODUCT_ID });

    expect(state).toMatchObject({ status: "success", data: { id: SPEC_A } });
    expect(mocks.db.productSpecification.create).toHaveBeenCalledWith({
      data: { productId: PRODUCT_ID, sortOrder: 2 },
      select: { id: true },
    });
  });
});

describe("moveProductSpecification", () => {
  it("swaps sortOrder with the neighbour", async () => {
    mocks.db.productSpecification.findMany.mockResolvedValue([
      { id: SPEC_A, sortOrder: 0 },
      { id: SPEC_B, sortOrder: 1 },
    ]);

    await moveProductSpecification({
      productId: PRODUCT_ID,
      specificationId: SPEC_B,
      direction: "up",
    });

    expect(mocks.db.productSpecification.update).toHaveBeenCalledWith({
      where: { id: SPEC_B },
      data: { sortOrder: 0 },
    });
    expect(mocks.db.productSpecification.update).toHaveBeenCalledWith({
      where: { id: SPEC_A },
      data: { sortOrder: 1 },
    });
  });

  it("refuses a row that no longer exists", async () => {
    mocks.db.productSpecification.findMany.mockResolvedValue([]);
    const state = await moveProductSpecification({
      productId: PRODUCT_ID,
      specificationId: SPEC_A,
      direction: "up",
    });
    expect(state).toMatchObject({ status: "error" });
  });
});

describe("removeProductSpecification", () => {
  it("removes the row (its translations cascade)", async () => {
    mocks.db.productSpecification.findFirst.mockResolvedValue({ id: SPEC_A });
    const state = await removeProductSpecification({
      productId: PRODUCT_ID,
      specificationId: SPEC_A,
    });
    expect(state).toMatchObject({ status: "success" });
    expect(mocks.db.productSpecification.delete).toHaveBeenCalledWith({ where: { id: SPEC_A } });
  });

  it("refuses a row from a different product", async () => {
    mocks.db.productSpecification.findFirst.mockResolvedValue(null);
    const state = await removeProductSpecification({
      productId: PRODUCT_ID,
      specificationId: SPEC_A,
    });
    expect(state).toMatchObject({ status: "error" });
    expect(mocks.db.productSpecification.delete).not.toHaveBeenCalled();
  });
});

describe("updateProductSpecificationTranslation", () => {
  it("requires both label and value", async () => {
    mocks.db.productSpecification.findFirst.mockResolvedValue({ id: SPEC_A });
    const state = await updateProductSpecificationTranslation({
      productId: PRODUCT_ID,
      specificationId: SPEC_A,
      locale: "en",
      label: "",
      value: "4mm",
    });
    expect(state).toMatchObject({ status: "error", code: "validation" });
    expect(mocks.db.productSpecificationTranslation.upsert).not.toHaveBeenCalled();
  });

  it("upserts the label/value pair for the locale", async () => {
    mocks.db.productSpecification.findFirst.mockResolvedValue({ id: SPEC_A });

    const state = await updateProductSpecificationTranslation({
      productId: PRODUCT_ID,
      specificationId: SPEC_A,
      locale: "en",
      label: "Mesh size",
      value: "4mm",
    });

    expect(state).toMatchObject({ status: "success" });
    expect(mocks.db.productSpecificationTranslation.upsert).toHaveBeenCalledWith({
      where: { specificationId_locale: { specificationId: SPEC_A, locale: "en" } },
      create: { specificationId: SPEC_A, locale: "en", label: "Mesh size", value: "4mm" },
      update: { label: "Mesh size", value: "4mm" },
    });
  });
});
