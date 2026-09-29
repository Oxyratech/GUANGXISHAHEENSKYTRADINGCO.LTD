// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Permission } from "@/server/auth/permissions";
import type { AuthSession } from "@/server/auth/session";
import type { AssetMeta } from "@/server/storage";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAssetMeta: vi.fn(),
  readAssetBytes: vi.fn(),
  writeAudit: vi.fn(),
}));

vi.mock("@/server/auth/session", () => ({ getSession: mocks.getSession }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/server/audit", () => ({ writeAudit: mocks.writeAudit }));
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

function session(...permissions: Permission[]): AuthSession {
  return {
    sessionId: "s1",
    user: { id: "u1", email: "sales@example.com", name: "Sam Sales" },
    roles: ["SALES_MANAGER"],
    permissions: new Set(permissions),
  };
}

function meta(overrides: Partial<AssetMeta> = {}): AssetMeta {
  return {
    id: ID,
    kind: "DOCUMENT",
    visibility: "PRIVATE",
    fileName: "Buyer RFQ.pdf",
    mimeType: "application/pdf",
    sizeBytes: 3,
    sha256: "ab".repeat(32),
    width: null,
    height: null,
    uploadedById: null,
    createdAt: new Date("2026-06-18T00:00:00Z"),
    isInquiryAttachment: true,
    ...overrides,
  };
}

const call = (id = ID) =>
  GET(new Request(`https://example.com/files/${id}`), { params: Promise.resolve({ id }) });

beforeEach(() => {
  mocks.getSession.mockReset().mockResolvedValue(session("inquiry:read"));
  mocks.getAssetMeta.mockReset().mockResolvedValue(meta());
  mocks.readAssetBytes.mockReset().mockResolvedValue(Buffer.from([1, 2, 3]));
  mocks.writeAudit.mockReset().mockResolvedValue(undefined);
});

describe("GET /files/[id]: authentication and authorisation", () => {
  it("401 without a session, before touching storage", async () => {
    mocks.getSession.mockResolvedValue(null);

    const response = await call();

    expect(response.status).toBe(401);
    expect(mocks.getAssetMeta).not.toHaveBeenCalled();
    expect(mocks.readAssetBytes).not.toHaveBeenCalled();
  });

  it("403 for a signed-in user with neither inquiry:read nor media:read, without probing which ids exist", async () => {
    mocks.getSession.mockResolvedValue(session("product:read", "dashboard:read"));

    const response = await call();

    expect(response.status).toBe(403);
    expect(mocks.getAssetMeta).not.toHaveBeenCalled();
  });

  it("inquiry attachments need inquiry:read: allowed", async () => {
    mocks.getSession.mockResolvedValue(session("inquiry:read"));

    expect((await call()).status).toBe(200);
  });

  it("inquiry attachments need inquiry:read: media:read alone is refused (403)", async () => {
    mocks.getSession.mockResolvedValue(session("media:read"));

    const response = await call();

    expect(response.status).toBe(403);
    expect(mocks.readAssetBytes).not.toHaveBeenCalled();
  });

  it("other private files need media:read: allowed", async () => {
    mocks.getAssetMeta.mockResolvedValue(meta({ isInquiryAttachment: false }));
    mocks.getSession.mockResolvedValue(session("media:read"));

    expect((await call()).status).toBe(200);
  });

  it("other private files need media:read: inquiry:read alone is refused (403)", async () => {
    mocks.getAssetMeta.mockResolvedValue(meta({ isInquiryAttachment: false }));
    mocks.getSession.mockResolvedValue(session("inquiry:read"));

    expect((await call()).status).toBe(403);
  });
});

describe("GET /files/[id]: lookup", () => {
  it("404 for malformed ids, unknown ids and PUBLIC assets", async () => {
    expect((await call("nope")).status).toBe(404);

    mocks.getAssetMeta.mockResolvedValueOnce(null);
    expect((await call()).status).toBe(404);

    mocks.getAssetMeta.mockResolvedValueOnce(meta({ visibility: "PUBLIC" }));
    expect((await call()).status).toBe(404);

    expect(mocks.readAssetBytes).not.toHaveBeenCalled();
  });

  it("404 when the bytes are missing", async () => {
    mocks.readAssetBytes.mockResolvedValue(null);
    expect((await call()).status).toBe(404);
  });

  it("503 during a database outage", async () => {
    mocks.getAssetMeta.mockRejectedValue(Object.assign(new Error("down"), { code: "P1001" }));
    expect((await call()).status).toBe(503);
  });

  it("500 without detail for unexpected failures", async () => {
    mocks.getAssetMeta.mockRejectedValue(new Error("boom with internals"));

    const response = await call();

    expect(response.status).toBe(500);
    expect(await response.text()).toBe("");
  });
});

describe("GET /files/[id]: the response", () => {
  it("is a private, uncacheable, non-sniffable download", async () => {
    const response = await call();

    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe(
      `attachment; filename="Buyer RFQ.pdf"; filename*=UTF-8''Buyer%20RFQ.pdf`,
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-length")).toBe("3");
    expect(response.headers.get("etag")).toBeNull();
  });

  it("is an attachment even for images", async () => {
    mocks.getAssetMeta.mockResolvedValue(
      meta({ kind: "IMAGE", mimeType: "image/png", fileName: "spec.png" }),
    );

    expect((await call()).headers.get("content-disposition")).toMatch(/^attachment;/);
  });

  it("records who downloaded the file", async () => {
    await call();

    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { id: "u1", email: "sales@example.com" },
        action: "media.private_file_downloaded",
        entityType: "media",
        entityId: ID,
      }),
    );
  });

  it("does not audit refused requests", async () => {
    mocks.getSession.mockResolvedValue(null);
    await call();
    mocks.getSession.mockResolvedValue(session("media:read"));
    await call();

    expect(mocks.writeAudit).not.toHaveBeenCalled();
  });
});
