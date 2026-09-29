// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AssetMeta } from "@/server/storage";

const mocks = vi.hoisted(() => ({ getAssetMeta: vi.fn(), readAssetBytes: vi.fn() }));

vi.mock("@/server/storage", () => ({
  isValidAssetId: (id: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
  getAssetMeta: mocks.getAssetMeta,
  readAssetBytes: mocks.readAssetBytes,
}));
vi.mock("@/server/db", async () => await import("@/server/db/errors"));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET } from "./route";

const ID = "0f8fad5b-d9cb-469f-a165-70867728950e";
const SHA = "ab".repeat(32);

function meta(overrides: Partial<AssetMeta> = {}): AssetMeta {
  return {
    id: ID,
    kind: "IMAGE",
    visibility: "PUBLIC",
    fileName: "Factory floor.png",
    mimeType: "image/png",
    sizeBytes: 3,
    sha256: SHA,
    width: 8,
    height: 8,
    uploadedById: null,
    createdAt: new Date("2026-06-18T00:00:00Z"),
    isInquiryAttachment: false,
    ...overrides,
  };
}

const request = (headers: Record<string, string> = {}) =>
  new Request(`https://example.com/media/${ID}`, { headers });
const call = (id = ID, headers?: Record<string, string>) =>
  GET(request(headers), { params: Promise.resolve({ id }) });

beforeEach(() => {
  mocks.getAssetMeta.mockReset().mockResolvedValue(meta());
  mocks.readAssetBytes.mockReset().mockResolvedValue(Buffer.from([1, 2, 3]));
});

describe("GET /media/[id]", () => {
  it("serves a public image inline with its verified type and long-lived caching", async () => {
    const response = await call();

    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("content-length")).toBe("3");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(response.headers.get("etag")).toBe(`"${SHA}"`);
    expect(response.headers.get("content-disposition")).toBe(
      `inline; filename="Factory floor.png"; filename*=UTF-8''Factory%20floor.png`,
    );
  });

  it("serves a public document as a download", async () => {
    mocks.getAssetMeta.mockResolvedValue(
      meta({ kind: "DOCUMENT", mimeType: "application/pdf", fileName: "Catalogue.pdf" }),
    );

    const response = await call();

    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toMatch(/^attachment;/);
  });

  it("uses the stored verified type, never one implied by the file name", async () => {
    mocks.getAssetMeta.mockResolvedValue(
      meta({ fileName: "totally-safe.html", mimeType: "image/png" }),
    );

    const response = await call();

    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("answers 404 for private assets, identically to a missing one, without reading the bytes", async () => {
    mocks.getAssetMeta.mockResolvedValueOnce(meta({ visibility: "PRIVATE" }));
    const privateResponse = await call();
    mocks.getAssetMeta.mockResolvedValueOnce(null);
    const missingResponse = await call();

    expect(privateResponse.status).toBe(404);
    expect(missingResponse.status).toBe(404);
    expect([...privateResponse.headers].sort()).toEqual([...missingResponse.headers].sort());
    expect(await privateResponse.text()).toBe(await missingResponse.text());
    expect(mocks.readAssetBytes).not.toHaveBeenCalled();
  });

  it("answers 404 for malformed ids without touching storage", async () => {
    for (const id of ["nope", "../secret", "1' OR '1'='1"]) {
      expect((await call(id)).status).toBe(404);
    }
    expect(mocks.getAssetMeta).not.toHaveBeenCalled();
  });

  it("answers 404 when the metadata exists but the bytes are gone", async () => {
    mocks.readAssetBytes.mockResolvedValue(null);
    expect((await call()).status).toBe(404);
  });

  it("answers 304 without reading the bytes when the ETag matches", async () => {
    for (const header of [`"${SHA}"`, `W/"${SHA}"`, `"other", "${SHA}"`, "*"]) {
      const response = await call(ID, { "if-none-match": header });

      expect(response.status).toBe(304);
      expect(response.headers.get("etag")).toBe(`"${SHA}"`);
      expect(response.headers.get("cache-control")).toContain("immutable");
      expect(await response.text()).toBe("");
    }
    expect(mocks.readAssetBytes).not.toHaveBeenCalled();
  });

  it("serves the full response when If-None-Match does not match", async () => {
    const response = await call(ID, { "if-none-match": '"something-else"' });
    expect(response.status).toBe(200);
  });

  it("answers 503 (no-store) during a database outage and 500 for anything unexpected, leaking nothing", async () => {
    mocks.getAssetMeta.mockRejectedValueOnce(
      Object.assign(new Error("connect ECONNREFUSED 10.0.0.5"), { code: "ECONNREFUSED" }),
    );
    const outage = await call();
    expect(outage.status).toBe(503);
    expect(outage.headers.get("cache-control")).toBe("no-store");

    mocks.getAssetMeta.mockRejectedValueOnce(new Error("secret internal detail"));
    const failure = await call();
    expect(failure.status).toBe(500);
    expect(await failure.text()).toBe("");
  });
});
