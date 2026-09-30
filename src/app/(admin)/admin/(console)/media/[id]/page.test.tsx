import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/toast";
import { DatabaseUnavailableError } from "@/server/db/errors";
import type { Permission } from "@/server/auth/permissions";
import type { AuthSession } from "@/server/auth/session";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn(),
  getMediaAssetDetail: vi.fn(),
  deleteMediaAsset: vi.fn(),
  updateMediaTranslation: vi.fn(),
  describeMediaUsage: vi.fn(),
}));

class RedirectSignal extends Error {}

vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/ui/test-utils")).navigationMock,
);
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/admin/media/m1",
}));
vi.mock("@/server/auth/session", () => ({ getSession: mocks.getSession }));
vi.mock("@/server/admin/media", () => ({
  getMediaAssetDetail: mocks.getMediaAssetDetail,
  deleteMediaAsset: mocks.deleteMediaAsset,
  updateMediaTranslation: mocks.updateMediaTranslation,
  describeMediaUsage: mocks.describeMediaUsage,
}));

import MediaAssetDetailPage from "./page";

function makeSession(permissions: Permission[]): AuthSession {
  return {
    sessionId: "s1",
    user: { id: "u1", email: "staff@example.com", name: "Staff" },
    roles: ["CONTENT_MANAGER"],
    permissions: new Set(permissions),
  };
}

const NO_USAGE = {
  productImages: [],
  productDocuments: [],
  newsCovers: [],
  seoOgImages: [],
  inquiryAttachments: [],
};

function baseAsset(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "m1",
    kind: "IMAGE",
    visibility: "PUBLIC",
    fileName: "hero.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 204800,
    sha256: "a".repeat(64),
    width: 800,
    height: 600,
    uploadedBy: { id: "u1", name: "Staff", email: "staff@example.com" },
    createdAt: new Date("2026-09-01T00:00:00Z"),
    translations: [],
    usage: NO_USAGE,
    ...overrides,
  };
}

async function renderPage(id = "m1") {
  const page = await MediaAssetDetailPage({ params: Promise.resolve({ id }) });
  render(
    <Toaster viewportLabel="Notifications" closeLabel="Close">
      {page}
    </Toaster>,
  );
}

beforeEach(() => {
  mocks.getSession
    .mockReset()
    .mockResolvedValue(makeSession(["media:read", "media:upload", "media:delete"]));
  mocks.redirect.mockReset().mockImplementation((path: string) => {
    throw new RedirectSignal(path);
  });
  mocks.getMediaAssetDetail.mockReset().mockResolvedValue(baseAsset());
  mocks.deleteMediaAsset.mockReset();
  mocks.updateMediaTranslation.mockReset();
  mocks.describeMediaUsage.mockReset().mockReturnValue([]);
});

describe("access", () => {
  it("sends a visitor without a session to the login page and reads nothing", async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(MediaAssetDetailPage({ params: Promise.resolve({ id: "m1" }) })).rejects.toThrow(
      RedirectSignal,
    );
    expect(mocks.getMediaAssetDetail).not.toHaveBeenCalled();
  });

  it("shows the 403 panel to a user without media:read", async () => {
    mocks.getSession.mockResolvedValue(makeSession(["dashboard:read"]));

    await renderPage();

    expect(
      screen.getByRole("heading", { name: "You do not have access to this page" }),
    ).toBeInTheDocument();
    expect(mocks.getMediaAssetDetail).not.toHaveBeenCalled();
  });

  it("reports a database outage honestly", async () => {
    mocks.getMediaAssetDetail.mockRejectedValue(
      new DatabaseUnavailableError("down", { cause: "connection" }),
    );

    await renderPage();

    expect(
      screen.getByRole("heading", { name: "The database could not be reached" }),
    ).toBeInTheDocument();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("shows a not-found panel for an asset that does not exist", async () => {
    mocks.getMediaAssetDetail.mockResolvedValue(null);

    await renderPage("missing");

    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  });
});

describe("public URL", () => {
  it("shows a copyable public URL for a PUBLIC asset", async () => {
    await renderPage();

    expect(screen.getByText("Public URL")).toBeInTheDocument();
    const value = document.querySelector(".font-mono");
    expect(value?.textContent).toContain("/media/m1");
  });

  it("never shows a public URL for a PRIVATE asset", async () => {
    mocks.getMediaAssetDetail.mockResolvedValue(
      baseAsset({ visibility: "PRIVATE", fileName: "orphan-attachment.jpg" }),
    );

    await renderPage();

    expect(screen.queryByText("Public URL")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain("/media/m1");
    expect(screen.getByText(/Private assets have no public URL/)).toBeInTheDocument();
  });
});

describe("delete", () => {
  it("offers a confirm-then-delete control when nothing uses the asset", async () => {
    await renderPage();

    expect(screen.getByRole("button", { name: "Delete asset" })).toBeInTheDocument();
    expect(screen.queryByText(/This asset cannot be deleted/)).not.toBeInTheDocument();
  });

  it("is blocked, with an explanation, instead of a delete control while the asset is in use", async () => {
    mocks.describeMediaUsage.mockReturnValue(["2 product images", "1 news cover"]);

    await renderPage();

    expect(screen.queryByRole("button", { name: "Delete asset" })).not.toBeInTheDocument();
    expect(screen.getByText(/This asset cannot be deleted/)).toBeInTheDocument();
    expect(screen.getByText(/2 product images, 1 news cover/)).toBeInTheDocument();
  });

  it("hides the delete control entirely from someone without media:delete", async () => {
    mocks.getSession.mockResolvedValue(makeSession(["media:read", "media:upload"]));

    await renderPage();

    expect(screen.queryByRole("button", { name: "Delete asset" })).not.toBeInTheDocument();
  });
});

describe("alt text and caption", () => {
  it("shows an editable form per locale to someone with media:upload", async () => {
    mocks.getMediaAssetDetail.mockResolvedValue(
      baseAsset({ translations: [{ locale: "en", altText: "Company logo", caption: null }] }),
    );

    await renderPage();

    expect(screen.getByRole("textbox", { name: /Alt text \(English\)/ })).toHaveValue(
      "Company logo",
    );
    expect(screen.getByRole("button", { name: "Save English text" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save 简体中文 text/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save العربية text/ })).toBeInTheDocument();
  });

  it("shows read-only text, with no save controls, to someone without media:upload", async () => {
    mocks.getSession.mockResolvedValue(makeSession(["media:read"]));
    mocks.getMediaAssetDetail.mockResolvedValue(
      baseAsset({ translations: [{ locale: "en", altText: "Company logo", caption: null }] }),
    );

    await renderPage();

    expect(
      screen.getByText("Your account cannot edit media, so this is shown read-only."),
    ).toBeInTheDocument();
    expect(screen.getByText("Company logo")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Save/ })).not.toBeInTheDocument();
  });
});
