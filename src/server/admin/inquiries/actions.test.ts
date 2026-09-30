// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession } from "@/server/auth/session";

const mocks = vi.hoisted(() => {
  const db = {
    businessInquiry: { findUnique: vi.fn(), updateMany: vi.fn() },
    inquiryStatusChange: { create: vi.fn() },
    inquiryNote: { create: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  };
  return {
    db,
    getDb: vi.fn(() => db),
    requirePermissionOrThrow: vi.fn(),
    writeAudit: vi.fn(),
    getRequestContext: vi.fn(),
    revalidatePath: vi.fn(),
  };
});

class RedirectSignal extends Error {}

vi.mock("next/navigation", () => ({
  unstable_rethrow: (error: unknown) => {
    if (error instanceof RedirectSignal) throw error;
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
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
import { addInquiryNote, assignInquiry, changeInquiryStatus } from "./actions";

const IP_HASH = "a".repeat(64);
const INQUIRY_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";

const session: AuthSession = {
  sessionId: "s1",
  user: { id: "staff-1", email: "staff@example.com", name: "Staff" },
  roles: ["SALES_MANAGER"],
  permissions: new Set(["inquiry:update", "inquiry:note"]),
};

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

beforeEach(() => {
  mocks.getDb.mockReset().mockReturnValue(mocks.db);
  mocks.db.businessInquiry.findUnique.mockReset();
  mocks.db.businessInquiry.updateMany.mockReset().mockResolvedValue({ count: 1 });
  mocks.db.inquiryStatusChange.create.mockReset().mockResolvedValue({});
  mocks.db.inquiryNote.create.mockReset();
  mocks.db.user.findUnique.mockReset();
  // Interactive transactions in this mock just run the callback against the same fake delegates.
  mocks.db.$transaction
    .mockReset()
    .mockImplementation((callback: (tx: typeof mocks.db) => unknown) => callback(mocks.db));
  mocks.requirePermissionOrThrow.mockReset().mockResolvedValue(session);
  mocks.writeAudit.mockReset().mockResolvedValue(undefined);
  mocks.revalidatePath.mockReset();
  mocks.getRequestContext
    .mockReset()
    .mockResolvedValue({ ip: "203.0.113.9", ipHash: IP_HASH, userAgent: "UA", origin: null });
});

describe("changeInquiryStatus", () => {
  it("requires inquiry:update and never touches the database without it", async () => {
    mocks.requirePermissionOrThrow.mockRejectedValue(new AuthorizationError("inquiry:update"));

    const state = await changeInquiryStatus(
      undefined,
      form({ id: INQUIRY_ID, version: "0", status: "REVIEWING" }),
    );

    expect(state).toMatchObject({ status: "error", code: "forbidden" });
    expect(mocks.db.businessInquiry.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a status that is not one of the eight known codes", async () => {
    const state = await changeInquiryStatus(
      undefined,
      form({ id: INQUIRY_ID, version: "0", status: "BOGUS" }),
    );

    expect(state).toMatchObject({ status: "error", code: "validation" });
  });

  it("refuses a no-op transition without writing anything", async () => {
    mocks.db.businessInquiry.findUnique.mockResolvedValue({ status: "NEW" });

    const state = await changeInquiryStatus(
      undefined,
      form({ id: INQUIRY_ID, version: "0", status: "NEW" }),
    );

    expect(state).toMatchObject({ status: "error", code: "rejected" });
    expect(mocks.db.businessInquiry.updateMany).not.toHaveBeenCalled();
    expect(mocks.writeAudit).not.toHaveBeenCalled();
  });

  it("writes the new status, a status-change row and an audit entry together", async () => {
    mocks.db.businessInquiry.findUnique.mockResolvedValue({ status: "NEW" });

    const state = await changeInquiryStatus(
      undefined,
      form({ id: INQUIRY_ID, version: "2", status: "REVIEWING" }),
    );

    expect(state).toMatchObject({ status: "success" });
    expect(mocks.db.businessInquiry.updateMany).toHaveBeenCalledWith({
      where: { id: INQUIRY_ID, version: 2 },
      data: { status: "REVIEWING", version: { increment: 1 } },
    });
    expect(mocks.db.inquiryStatusChange.create).toHaveBeenCalledWith({
      data: {
        inquiryId: INQUIRY_ID,
        fromStatus: "NEW",
        toStatus: "REVIEWING",
        changedById: session.user.id,
      },
    });
    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "inquiry.status_changed",
        entityType: "inquiry",
        entityId: INQUIRY_ID,
      }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/admin/inquiries/${INQUIRY_ID}`);
  });

  it("reports a stale version as a conflict and writes nothing else", async () => {
    mocks.db.businessInquiry.findUnique.mockResolvedValue({ status: "NEW" });
    mocks.db.businessInquiry.updateMany.mockResolvedValue({ count: 0 });

    const state = await changeInquiryStatus(
      undefined,
      form({ id: INQUIRY_ID, version: "0", status: "REVIEWING" }),
    );

    expect(state).toMatchObject({
      status: "error",
      code: "conflict",
      message: "This record was changed by someone else. Reload and try again.",
    });
    expect(mocks.db.inquiryStatusChange.create).not.toHaveBeenCalled();
    expect(mocks.writeAudit).not.toHaveBeenCalled();
  });
});

describe("assignInquiry", () => {
  it("requires inquiry:update", async () => {
    mocks.requirePermissionOrThrow.mockRejectedValue(new AuthorizationError("inquiry:update"));

    const state = await assignInquiry(
      undefined,
      form({ id: INQUIRY_ID, version: "0", assigneeId: USER_ID }),
    );

    expect(state).toMatchObject({ code: "forbidden" });
    expect(mocks.db.businessInquiry.updateMany).not.toHaveBeenCalled();
  });

  it("rejects an inactive user", async () => {
    mocks.db.user.findUnique.mockResolvedValue({ isActive: false, name: "Old Staff" });

    const state = await assignInquiry(
      undefined,
      form({ id: INQUIRY_ID, version: "0", assigneeId: USER_ID }),
    );

    expect(state).toMatchObject({
      status: "error",
      code: "rejected",
      fieldErrors: { assigneeId: ["Choose an active admin user."] },
    });
    expect(mocks.db.businessInquiry.updateMany).not.toHaveBeenCalled();
  });

  it("rejects an id that matches no user at all", async () => {
    mocks.db.user.findUnique.mockResolvedValue(null);

    const state = await assignInquiry(
      undefined,
      form({ id: INQUIRY_ID, version: "0", assigneeId: USER_ID }),
    );

    expect(state).toMatchObject({ code: "rejected" });
  });

  it("assigns to an active user", async () => {
    mocks.db.user.findUnique.mockResolvedValue({ isActive: true, name: "Amina Yusuf" });

    const state = await assignInquiry(
      undefined,
      form({ id: INQUIRY_ID, version: "3", assigneeId: USER_ID }),
    );

    expect(state).toMatchObject({ status: "success", message: "Assigned to Amina Yusuf" });
    expect(mocks.db.businessInquiry.updateMany).toHaveBeenCalledWith({
      where: { id: INQUIRY_ID, version: 3 },
      data: { assignedToId: USER_ID, version: { increment: 1 } },
    });
    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "inquiry.assigned", summary: "Assigned to Amina Yusuf" }),
    );
  });

  it("unassigns when the field is left blank, without looking up a user", async () => {
    const state = await assignInquiry(
      undefined,
      form({ id: INQUIRY_ID, version: "1", assigneeId: "" }),
    );

    expect(mocks.db.user.findUnique).not.toHaveBeenCalled();
    expect(state).toMatchObject({ status: "success", message: "Unassigned" });
    expect(mocks.db.businessInquiry.updateMany).toHaveBeenCalledWith({
      where: { id: INQUIRY_ID, version: 1 },
      data: { assignedToId: null, version: { increment: 1 } },
    });
  });

  it("reports a concurrency conflict", async () => {
    mocks.db.businessInquiry.updateMany.mockResolvedValue({ count: 0 });

    const state = await assignInquiry(
      undefined,
      form({ id: INQUIRY_ID, version: "0", assigneeId: "" }),
    );

    expect(state).toMatchObject({ code: "conflict" });
  });
});

describe("addInquiryNote", () => {
  it("requires inquiry:note", async () => {
    mocks.requirePermissionOrThrow.mockRejectedValue(new AuthorizationError("inquiry:note"));

    const state = await addInquiryNote(
      undefined,
      form({ id: INQUIRY_ID, body: "Called the buyer." }),
    );

    expect(state).toMatchObject({ code: "forbidden" });
    expect(mocks.db.inquiryNote.create).not.toHaveBeenCalled();
  });

  it("rejects an empty note", async () => {
    const state = await addInquiryNote(undefined, form({ id: INQUIRY_ID, body: "" }));

    expect(state).toMatchObject({ status: "error", code: "validation" });
    expect(mocks.db.inquiryNote.create).not.toHaveBeenCalled();
  });

  it("refuses a note on an inquiry that no longer exists", async () => {
    mocks.db.businessInquiry.findUnique.mockResolvedValue(null);

    const state = await addInquiryNote(
      undefined,
      form({ id: INQUIRY_ID, body: "Called the buyer." }),
    );

    expect(state).toMatchObject({ status: "error", code: "rejected" });
    expect(mocks.db.inquiryNote.create).not.toHaveBeenCalled();
  });

  it("creates the note attributed to the signed-in user and audits it", async () => {
    mocks.db.businessInquiry.findUnique.mockResolvedValue({ id: INQUIRY_ID });
    mocks.db.inquiryNote.create.mockResolvedValue({
      id: "n1",
      body: "Called the buyer.",
      createdAt: new Date("2026-06-01T00:00:00Z"),
    });

    const state = await addInquiryNote(
      undefined,
      form({ id: INQUIRY_ID, body: "Called the buyer." }),
    );

    expect(state).toMatchObject({ status: "success" });
    expect(mocks.db.inquiryNote.create).toHaveBeenCalledWith({
      data: { inquiryId: INQUIRY_ID, authorId: session.user.id, body: "Called the buyer." },
      select: { id: true, body: true, createdAt: true },
    });
    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "inquiry.note_added", entityId: INQUIRY_ID }),
    );
  });
});
