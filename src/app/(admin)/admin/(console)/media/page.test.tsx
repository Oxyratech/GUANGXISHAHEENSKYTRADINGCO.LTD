import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/toast";
import { DatabaseUnavailableError } from "@/server/db/errors";
import type { Permission } from "@/server/auth/permissions";
import type { AuthSession } from "@/server/auth/session";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn(),
  listMediaLibrary: vi.fn(),
  listPrivateAttachments: vi.fn(),
}));

class RedirectSignal extends Error {}

vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/ui/test-utils")).navigationMock,
);
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/server/auth/session", () => ({ getSession: mocks.getSession }));
vi.mock("@/server/admin/media", () => ({
  listMediaLibrary: mocks.listMediaLibrary,
  listPrivateAttachments: mocks.listPrivateAttachments,
  uploadMediaAsset: vi.fn(),
  ADMIN_UPLOAD_POLICIES: {
    PRODUCT_IMAGE: { label: "Product image", policy: { name: "PRODUCT_IMAGE" } },
    NEWS_IMAGE: { label: "News cover or inline image", policy: { name: "NEWS_IMAGE" } },
    PUBLIC_DOCUMENT: { label: "Public document (PDF)", policy: { name: "PUBLIC_DOCUMENT" } },
  },
  ADMIN_UPLOAD_POLICY_KEYS: ["PRODUCT_IMAGE", "NEWS_IMAGE", "PUBLIC_DOCUMENT"],
}));
vi.mock("@/server/storage", () => ({
  describeUploadPolicy: () => ({
    maxBytes: 5_000_000,
    mimeTypes: ["image/jpeg"],
    extensions: ["jpg"],
  }),
}));

import MediaLibraryPage from "./page";

function makeSession(permissions: Permission[]): AuthSession {
  return {
    sessionId: "s1",
    user: { id: "u1", email: "staff@example.com", name: "Staff" },
    roles: ["CONTENT_MANAGER"],
    permissions: new Set(permissions),
  };
}

const EMPTY_PAGE = {
  rows: [],
  meta: {
    total: 0,
    page: 1,
    pageSize: 20,
    pageCount: 1,
    from: 0,
    to: 0,
    hasPrevious: false,
    hasNext: false,
  },
};

function pageMeta(total: number) {
  return {
    total,
    page: 1,
    pageSize: 20,
    pageCount: 1,
    from: total > 0 ? 1 : 0,
    to: total,
    hasPrevious: false,
    hasNext: false,
  };
}

async function renderPage(searchParams: Record<string, string | string[] | undefined> = {}) {
  const page = await MediaLibraryPage({ searchParams: Promise.resolve(searchParams) });
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
  mocks.listMediaLibrary.mockReset().mockResolvedValue(EMPTY_PAGE);
  mocks.listPrivateAttachments.mockReset().mockResolvedValue(EMPTY_PAGE);
});

describe("access", () => {
  it("sends a visitor without a session to the login page and reads nothing", async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(MediaLibraryPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      RedirectSignal,
    );
    expect(mocks.listMediaLibrary).not.toHaveBeenCalled();
  });

  it("shows the 403 panel to a user without media:read, having read nothing", async () => {
    mocks.getSession.mockResolvedValue(makeSession(["dashboard:read"]));

    await renderPage();

    expect(
      screen.getByRole("heading", { name: "You do not have access to this page" }),
    ).toBeInTheDocument();
    expect(screen.getByText("media:read")).toBeInTheDocument();
    expect(mocks.listMediaLibrary).not.toHaveBeenCalled();
  });

  it("reports a database outage honestly, not as a sign-out", async () => {
    mocks.getSession.mockResolvedValue(makeSession(["media:read"]));
    mocks.listMediaLibrary.mockRejectedValue(
      new DatabaseUnavailableError("down", { cause: "connection" }),
    );

    await renderPage();

    expect(
      screen.getByRole("heading", { name: "The database could not be reached" }),
    ).toBeInTheDocument();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

describe("upload panel visibility", () => {
  it("shows the upload panel to someone who holds media:upload", async () => {
    await renderPage();

    expect(screen.getByRole("heading", { name: "Upload media" })).toBeInTheDocument();
  });

  it("hides the upload panel from someone without media:upload", async () => {
    mocks.getSession.mockResolvedValue(makeSession(["media:read"]));

    await renderPage();

    expect(screen.queryByRole("heading", { name: "Upload media" })).not.toBeInTheDocument();
  });
});

describe("empty states", () => {
  it("says honestly that no media matches these filters", async () => {
    await renderPage();

    expect(screen.getByText("No media matches these filters.")).toBeInTheDocument();
  });

  it("says honestly that no private attachments exist, once that tab is open", async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole("tab", { name: "Private attachments" }));

    expect(screen.getByText("No private attachments yet.")).toBeInTheDocument();
  });
});

describe("with media", () => {
  const IMAGE_ROW = {
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
    usage: {
      productImages: 1,
      productDocuments: 0,
      newsCovers: 0,
      seoOgImages: 0,
      inquiryAttachments: 0,
    },
  };
  const DOCUMENT_ROW = {
    id: "m2",
    kind: "DOCUMENT",
    visibility: "PUBLIC",
    fileName: "catalogue.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1_048_576,
    sha256: "b".repeat(64),
    width: null,
    height: null,
    uploadedBy: null,
    createdAt: new Date("2026-09-02T00:00:00Z"),
    usage: {
      productImages: 0,
      productDocuments: 0,
      newsCovers: 0,
      seoOgImages: 0,
      inquiryAttachments: 0,
    },
  };

  it("renders public images as a grid and documents as a table", async () => {
    mocks.listMediaLibrary.mockResolvedValue({
      rows: [IMAGE_ROW, DOCUMENT_ROW],
      meta: pageMeta(2),
    });

    await renderPage();

    const grid = screen.getByRole("img", { name: "Preview of hero.jpg" });
    expect(grid).toHaveAttribute("src", "/media/m1");
    expect(screen.getByRole("table", { name: "Documents" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("table", { name: "Documents" })).getByText("catalogue.pdf"),
    ).toBeInTheDocument();
  });

  it("never renders a private image inline, even in the grid", async () => {
    mocks.listMediaLibrary.mockResolvedValue({
      rows: [{ ...IMAGE_ROW, id: "m3", visibility: "PRIVATE", fileName: "orphan.jpg" }],
      meta: pageMeta(1),
    });

    await renderPage();

    // No <img> tag at all for a private asset — only the "no preview" placeholder.
    expect(document.querySelector("img")).not.toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Private image, no preview: orphan.jpg" }),
    ).toBeInTheDocument();
  });

  it("lists private inquiry attachments read-only, linking to the owning inquiry", async () => {
    mocks.listPrivateAttachments.mockResolvedValue({
      rows: [
        {
          id: "att1",
          createdAt: new Date("2026-09-03T00:00:00Z"),
          asset: { id: "m9", fileName: "spec.pdf", mimeType: "application/pdf", sizeBytes: 1000 },
          inquiry: {
            id: "i1",
            referenceCode: "INQ-7K3Q9M2X",
            company: "Acme Trading",
            status: "NEW",
          },
        },
      ],
      meta: pageMeta(1),
    });

    const user = userEvent.setup();
    await renderPage();
    await user.click(screen.getByRole("tab", { name: "Private attachments" }));

    const table = screen.getByRole("table", { name: "Private inquiry attachments" });
    expect(within(table).getByRole("link", { name: "INQ-7K3Q9M2X" })).toHaveAttribute(
      "href",
      "/admin/inquiries/i1",
    );
    expect(within(table).getByText("Acme Trading")).toBeInTheDocument();
  });
});

describe("filters", () => {
  it("passes kind, visibility and file name search to the query", async () => {
    await renderPage({ kind: "IMAGE", visibility: "PUBLIC", q: "hero" });

    expect(mocks.listMediaLibrary).toHaveBeenCalledWith(
      { kind: "IMAGE", visibility: "PUBLIC", search: "hero" },
      expect.objectContaining({ page: 1 }),
    );
  });

  it("ignores an unrecognised kind or visibility instead of passing it through", async () => {
    await renderPage({ kind: "bogus", visibility: "bogus" });

    expect(mocks.listMediaLibrary).toHaveBeenCalledWith(
      { kind: undefined, visibility: undefined, search: undefined },
      expect.anything(),
    );
  });
});
