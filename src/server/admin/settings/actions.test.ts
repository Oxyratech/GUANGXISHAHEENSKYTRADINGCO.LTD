// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession } from "@/server/auth/session";

const mocks = vi.hoisted(() => ({
  requirePermissionOrThrow: vi.fn(),
  writeAudit: vi.fn(),
  getRequestContext: vi.fn(),
  logError: vi.fn(),
  updateSettings: vi.fn(),
}));

class RedirectSignal extends Error {}

vi.mock("next/navigation", () => ({
  unstable_rethrow: (error: unknown) => {
    if (error instanceof RedirectSignal) throw error;
  },
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
vi.mock("@/lib/logger", () => ({
  logger: { error: mocks.logError, warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock("@/server/settings", () => ({ updateSettings: mocks.updateSettings }));

import { updateContactSettings } from "./actions";

const session: AuthSession = {
  sessionId: "s1",
  user: { id: "u1", email: "admin@example.com", name: "Admin" },
  roles: ["ADMIN"],
  permissions: new Set(["settings:write"]),
};

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset?.();
  mocks.requirePermissionOrThrow.mockResolvedValue(session);
  mocks.writeAudit.mockResolvedValue(undefined);
  mocks.getRequestContext.mockResolvedValue({
    ip: "203.0.113.9",
    ipHash: "a".repeat(64),
    userAgent: "UA",
    origin: null,
  });
});

describe("updateContactSettings", () => {
  it("requires settings:write", async () => {
    await updateContactSettings(
      undefined,
      form({ "contact.email": "", "contact.phone": "", "contact.whatsapp": "" }),
    );
    expect(mocks.requirePermissionOrThrow).toHaveBeenCalledWith("settings:write");
  });

  it("forwards every field, including blanks that clear a setting, to updateSettings", async () => {
    mocks.updateSettings.mockResolvedValue({
      ok: true,
      updated: ["contact.email"],
      cleared: ["contact.phone"],
    });

    await updateContactSettings(
      undefined,
      form({ "contact.email": "sales@example.com", "contact.phone": "", "contact.whatsapp": "" }),
    );

    expect(mocks.updateSettings).toHaveBeenCalledWith(
      { id: "u1", email: "admin@example.com" },
      { "contact.email": "sales@example.com", "contact.phone": "", "contact.whatsapp": "" },
    );
  });

  it("maps a validation failure onto field errors with a friendly message", async () => {
    mocks.updateSettings.mockResolvedValue({
      ok: false,
      errors: { "contact.email": "invalid_email", "contact.phone": "invalid_phone" },
    });

    const state = await updateContactSettings(
      undefined,
      form({
        "contact.email": "not-an-email",
        "contact.phone": "not-a-number",
        "contact.whatsapp": "",
      }),
    );

    expect(state).toMatchObject({
      status: "error",
      fieldErrors: {
        "contact.email": [expect.stringContaining("valid email")],
        "contact.phone": [expect.stringContaining("international format")],
      },
    });
  });

  it("does not write a second audit entry: updateSettings already writes its own", async () => {
    mocks.updateSettings.mockResolvedValue({ ok: true, updated: [], cleared: [] });

    const state = await updateContactSettings(
      undefined,
      form({ "contact.email": "", "contact.phone": "", "contact.whatsapp": "" }),
    );

    expect(state).toMatchObject({ status: "success", message: "Settings saved." });
    expect(mocks.writeAudit).not.toHaveBeenCalled();
  });
});
