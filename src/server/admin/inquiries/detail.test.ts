// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseUnavailableError } from "@/server/db/errors";

const mocks = vi.hoisted(() => {
  const db = { businessInquiry: { findUnique: vi.fn() } };
  return { db, getDb: vi.fn(() => db) };
});

vi.mock("@/server/db", () => ({ getDb: mocks.getDb }));

import { getInquiryDetail } from "./detail";

const BASE_ROW = {
  id: "i1",
  referenceCode: "INQ-1",
  status: "NEW",
  version: 0,
  name: "Jane",
  company: "Acme",
  country: "CN",
  email: "jane@example.com",
  phone: null,
  whatsapp: null,
  productName: "Widgets",
  categorySlug: null,
  quantity: null,
  specification: null,
  targetPrice: null,
  destinationCountry: null,
  requiredDeliveryDate: null,
  additionalRequirements: null,
  locale: "en",
  consentAcceptedAt: new Date("2026-06-01T00:00:00Z"),
  createdAt: new Date("2026-06-01T00:00:00Z"),
  updatedAt: new Date("2026-06-01T00:00:00Z"),
  assignedTo: null,
  product: null,
  attachments: [],
  notes: [],
  statusChanges: [],
};

beforeEach(() => {
  mocks.getDb.mockReset().mockReturnValue(mocks.db);
  mocks.db.businessInquiry.findUnique.mockReset();
});

describe("getInquiryDetail", () => {
  it("returns null for an unknown id", async () => {
    mocks.db.businessInquiry.findUnique.mockResolvedValue(null);

    await expect(getInquiryDetail("missing")).resolves.toBeNull();
  });

  it("resolves the linked product's English name from its translations", async () => {
    mocks.db.businessInquiry.findUnique.mockResolvedValue({
      ...BASE_ROW,
      product: { id: "p1", slug: "widget", translations: [{ name: "Widget" }] },
    });

    const detail = await getInquiryDetail("i1");

    expect(detail?.product).toEqual({ id: "p1", slug: "widget", name: "Widget" });
  });

  it("falls back to the slug when the product has no English translation", async () => {
    mocks.db.businessInquiry.findUnique.mockResolvedValue({
      ...BASE_ROW,
      product: { id: "p1", slug: "widget", translations: [] },
    });

    const detail = await getInquiryDetail("i1");

    expect(detail?.product?.name).toBe("widget");
  });

  it("flattens attachments to the media asset's public fields", async () => {
    mocks.db.businessInquiry.findUnique.mockResolvedValue({
      ...BASE_ROW,
      attachments: [
        {
          id: "a1",
          createdAt: new Date("2026-06-02T00:00:00Z"),
          mediaAsset: {
            id: "m1",
            fileName: "spec.pdf",
            mimeType: "application/pdf",
            sizeBytes: 1024,
          },
        },
      ],
    });

    const detail = await getInquiryDetail("i1");

    expect(detail?.attachments).toEqual([
      {
        id: "a1",
        mediaAssetId: "m1",
        fileName: "spec.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        createdAt: new Date("2026-06-02T00:00:00Z"),
      },
    ]);
  });

  it("selects notes and status history without pulling ipHash or userAgent along", async () => {
    await getInquiryDetail("i1");

    const select = mocks.db.businessInquiry.findUnique.mock.calls[0][0].select;
    expect(select).toHaveProperty("notes");
    expect(select).toHaveProperty("statusChanges");
    expect(select).not.toHaveProperty("ipHash");
    expect(select).not.toHaveProperty("userAgent");
  });

  it("normalises a connection failure", async () => {
    mocks.db.businessInquiry.findUnique.mockRejectedValue(
      Object.assign(new Error("down"), { code: "ECONNREFUSED" }),
    );

    await expect(getInquiryDetail("i1")).rejects.toBeInstanceOf(DatabaseUnavailableError);
  });
});
