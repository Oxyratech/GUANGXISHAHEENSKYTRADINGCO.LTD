// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const db = { contactMessage: { findUnique: vi.fn(), update: vi.fn() } };
  return {
    db,
    getDb: vi.fn(() => db),
    requirePermissionOrThrow: vi.fn(),
    writeAudit: vi.fn(),
    getRequestContext: vi.fn(),
    revalidatePath: vi.fn(),
  };
});

vi.mock("next/navigation", () => ({ unstable_rethrow: () => {} }));
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
import type { AuthSession } from "@/server/auth/session";
import { changeContactMessageStatus, markContactMessageHandled } from "./actions";

const MESSAGE_ID = "33333333-3333-3333-3333-333333333333";
const session: AuthSession = {
  sessionId: "s1",
  user: { id: "staff-1", email: "staff@example.com", name: "Staff" },
  roles: ["SALES_MANAGER"],
  permissions: new Set(["contact:update"]),
};

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

beforeEach(() => {
  mocks.getDb.mockReset().mockReturnValue(mocks.db);
  mocks.db.contactMessage.findUnique.mockReset();
  mocks.db.contactMessage.update.mockReset().mockResolvedValue({});
  mocks.requirePermissionOrThrow.mockReset().mockResolvedValue(session);
  mocks.writeAudit.mockReset().mockResolvedValue(undefined);
  mocks.revalidatePath.mockReset();
  mocks.getRequestContext.mockReset().mockResolvedValue({
    ip: "203.0.113.9",
    ipHash: "a".repeat(64),
    userAgent: "UA",
    origin: null,
  });
});

describe("changeContactMessageStatus", () => {
  it("requires contact:update", async () => {
    mocks.requirePermissionOrThrow.mockRejectedValue(new AuthorizationError("contact:update"));

    const state = await changeContactMessageStatus(
      undefined,
      form({ id: MESSAGE_ID, status: "READ" }),
    );

    expect(state).toMatchObject({ code: "forbidden" });
    expect(mocks.db.contactMessage.update).not.toHaveBeenCalled();
  });

  it("rejects an unknown status", async () => {
    const state = await changeContactMessageStatus(
      undefined,
      form({ id: MESSAGE_ID, status: "BOGUS" }),
    );

    expect(state).toMatchObject({ status: "error", code: "validation" });
  });

  it("refuses a message that no longer exists", async () => {
    mocks.db.contactMessage.findUnique.mockResolvedValue(null);

    const state = await changeContactMessageStatus(
      undefined,
      form({ id: MESSAGE_ID, status: "READ" }),
    );

    expect(state).toMatchObject({ code: "rejected" });
    expect(mocks.db.contactMessage.update).not.toHaveBeenCalled();
  });

  it("refuses a no-op transition", async () => {
    mocks.db.contactMessage.findUnique.mockResolvedValue({ id: MESSAGE_ID, status: "NEW" });

    const state = await changeContactMessageStatus(
      undefined,
      form({ id: MESSAGE_ID, status: "NEW" }),
    );

    expect(state).toMatchObject({ code: "rejected" });
    expect(mocks.db.contactMessage.update).not.toHaveBeenCalled();
  });

  it("updates the status and writes an audit entry", async () => {
    mocks.db.contactMessage.findUnique.mockResolvedValue({ id: MESSAGE_ID, status: "NEW" });

    const state = await changeContactMessageStatus(
      undefined,
      form({ id: MESSAGE_ID, status: "READ" }),
    );

    expect(state).toMatchObject({ status: "success" });
    expect(mocks.db.contactMessage.update).toHaveBeenCalledWith({
      where: { id: MESSAGE_ID },
      data: { status: "READ" },
    });
    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "contact_message.status_changed",
        entityId: MESSAGE_ID,
        summary: "NEW → READ",
      }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/admin/contact-messages/${MESSAGE_ID}`);
  });
});

describe("markContactMessageHandled", () => {
  it("requires contact:update", async () => {
    mocks.requirePermissionOrThrow.mockRejectedValue(new AuthorizationError("contact:update"));

    const state = await markContactMessageHandled(undefined, form({ id: MESSAGE_ID }));

    expect(state).toMatchObject({ code: "forbidden" });
    expect(mocks.db.contactMessage.update).not.toHaveBeenCalled();
  });

  it("sets handledBy to the signed-in user", async () => {
    mocks.db.contactMessage.findUnique.mockResolvedValue({ id: MESSAGE_ID, status: "NEW" });

    const state = await markContactMessageHandled(undefined, form({ id: MESSAGE_ID }));

    expect(state).toMatchObject({ status: "success" });
    expect(mocks.db.contactMessage.update).toHaveBeenCalledWith({
      where: { id: MESSAGE_ID },
      data: { handledById: session.user.id },
    });
    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "contact_message.handled", entityId: MESSAGE_ID }),
    );
  });

  it("refuses a message that no longer exists", async () => {
    mocks.db.contactMessage.findUnique.mockResolvedValue(null);

    const state = await markContactMessageHandled(undefined, form({ id: MESSAGE_ID }));

    expect(state).toMatchObject({ code: "rejected" });
  });
});
