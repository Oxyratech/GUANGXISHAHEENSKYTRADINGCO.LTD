// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseUnavailableError } from "@/server/db/errors";
import type { AuthSession } from "@/server/auth/session";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  destroySession: vi.fn(),
  writeAudit: vi.fn(),
  getRequestContext: vi.fn(),
  redirect: vi.fn(),
  warn: vi.fn(),
}));

class RedirectSignal extends Error {}

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/auth/session", () => ({
  getSession: mocks.getSession,
  destroySession: mocks.destroySession,
}));
vi.mock("@/server/audit", () => ({ writeAudit: mocks.writeAudit }));
vi.mock("@/server/http/request-context", () => ({ getRequestContext: mocks.getRequestContext }));
vi.mock("@/lib/logger", () => ({
  logger: { warn: mocks.warn, error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { signOutAction } from "./sign-out-action";

const session: AuthSession = {
  sessionId: "s1",
  user: { id: "u1", email: "amina@example.com", name: "Amina" },
  roles: ["ADMIN"],
  permissions: new Set(),
};

async function run() {
  await expect(signOutAction()).rejects.toThrow(RedirectSignal);
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.getSession.mockResolvedValue(session);
  mocks.destroySession.mockResolvedValue(undefined);
  mocks.writeAudit.mockResolvedValue(undefined);
  mocks.getRequestContext.mockResolvedValue({
    ip: "203.0.113.9",
    ipHash: "c".repeat(64),
    userAgent: null,
    origin: null,
  });
  mocks.redirect.mockImplementation((path: string) => {
    throw new RedirectSignal(path);
  });
});

describe("signOutAction", () => {
  it("ends the session, records who signed out, and goes to the login page", async () => {
    await run();

    expect(mocks.destroySession).toHaveBeenCalledTimes(1);
    expect(mocks.writeAudit).toHaveBeenCalledWith({
      actor: { id: "u1", email: "amina@example.com" },
      action: "auth.logout",
      entityType: "user",
      entityId: "u1",
      summary: "Signed out",
      ipHash: "c".repeat(64),
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/login");
  });

  it("destroys the session before it writes the audit entry", async () => {
    const order: string[] = [];
    mocks.destroySession.mockImplementation(async () => void order.push("destroy"));
    mocks.writeAudit.mockImplementation(async () => void order.push("audit"));

    await run();

    expect(order).toEqual(["destroy", "audit"]);
  });

  it("still clears the cookie and redirects when nobody was signed in, without an audit entry", async () => {
    mocks.getSession.mockResolvedValue(null);

    await run();

    expect(mocks.destroySession).toHaveBeenCalledTimes(1);
    expect(mocks.writeAudit).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/login");
  });

  it("signs the user out even when the database is down", async () => {
    mocks.getSession.mockRejectedValue(
      new DatabaseUnavailableError("down", { cause: "connection" }),
    );

    await run();

    expect(mocks.destroySession).toHaveBeenCalledTimes(1);
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/login");
    expect(mocks.warn).toHaveBeenCalledWith(
      "admin.sign_out_session_unavailable",
      expect.anything(),
    );
  });

  it("does not let a failed audit entry keep the person from leaving", async () => {
    mocks.getRequestContext.mockRejectedValue(new Error("AUTH_SECRET is required in production"));

    await run();

    expect(mocks.destroySession).toHaveBeenCalledTimes(1);
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/login");
    expect(mocks.warn).toHaveBeenCalledWith("admin.sign_out_audit_failed", expect.anything());
  });
});
