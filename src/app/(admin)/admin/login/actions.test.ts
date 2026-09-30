// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseUnavailableError } from "@/server/db/errors";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  createSession: vi.fn(),
  getSession: vi.fn(),
  isDatabaseConfigured: vi.fn(),
  getRequestContext: vi.fn(),
  redirect: vi.fn(),
  logError: vi.fn(),
}));

class RedirectSignal extends Error {}

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/auth/login", () => ({ authenticate: mocks.authenticate }));
vi.mock("@/server/auth/session", () => ({
  createSession: mocks.createSession,
  getSession: mocks.getSession,
}));
vi.mock("@/server/db", () => ({ isDatabaseConfigured: mocks.isDatabaseConfigured }));
vi.mock("@/server/http/request-context", () => ({ getRequestContext: mocks.getRequestContext }));
vi.mock("@/lib/logger", () => ({
  logger: { error: mocks.logError, warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { loginAction } from "./actions";
import { IDLE_LOGIN_STATE } from "./login-state";

const PASSWORD = "Sup3r-secret-Passw0rd!";
const IP_HASH = "b".repeat(64);

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

const credentials = { email: "admin@example.com", password: PASSWORD };

/** Runs the action and returns either its state or the path it redirected to. */
async function run(fields: Record<string, string>) {
  try {
    return { state: await loginAction(IDLE_LOGIN_STATE, form(fields)), redirectedTo: null };
  } catch (error) {
    if (error instanceof RedirectSignal) return { state: null, redirectedTo: error.message };
    throw error;
  }
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.redirect.mockImplementation((path: string) => {
    throw new RedirectSignal(path);
  });
  mocks.isDatabaseConfigured.mockReturnValue(true);
  mocks.getRequestContext.mockResolvedValue({
    ip: "203.0.113.9",
    ipHash: IP_HASH,
    userAgent: "UA",
    origin: null,
  });
  mocks.authenticate.mockResolvedValue({ ok: true, userId: "u1" });
  mocks.createSession.mockResolvedValue({ sessionId: "s1", expiresAt: new Date() });
});

describe("a successful sign-in", () => {
  it("authenticates, starts a session with the hashed request details, then redirects", async () => {
    const { redirectedTo } = await run(credentials);

    expect(mocks.authenticate).toHaveBeenCalledWith({
      email: "admin@example.com",
      password: PASSWORD,
      ctx: { ipHash: IP_HASH, userAgent: "UA" },
    });
    expect(mocks.createSession).toHaveBeenCalledWith("u1", { ipHash: IP_HASH, userAgent: "UA" });
    expect(redirectedTo).toBe("/admin");
  });

  it("does not start a session before the credentials are checked", async () => {
    mocks.authenticate.mockResolvedValue({ ok: false, reason: "invalid_credentials" });

    await run(credentials);

    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("trims the email before checking it", async () => {
    await run({ ...credentials, email: "  admin@example.com  " });

    expect(mocks.authenticate.mock.calls[0][0].email).toBe("admin@example.com");
  });

  it("goes to the requested admin page", async () => {
    const { redirectedTo } = await run({ ...credentials, next: "/admin/inquiries?status=NEW" });

    expect(redirectedTo).toBe("/admin/inquiries?status=NEW");
  });
});

describe("open redirect prevention", () => {
  it.each([
    "https://evil.example",
    "https://evil.example/admin",
    "//evil.example",
    "//admin",
    "/\\evil.example",
    "javascript:alert(1)",
    "/en/products",
    "/",
    "/admin/../en",
    "/admin/%2e%2e/en",
    "/administrator",
    "/admin/login",
    "admin/users",
    "",
  ])("sends %j to the dashboard", async (next) => {
    const { redirectedTo } = await run({ ...credentials, next });

    expect(redirectedTo).toBe("/admin");
  });

  it("never redirects anywhere outside /admin, whatever `next` says", async () => {
    for (const next of ["https://a.example", "//b.example", "/c", "/admin/x", "/admin"]) {
      const { redirectedTo } = await run({ ...credentials, next });
      expect(redirectedTo).toMatch(/^\/admin(\/|$|\?)/);
    }
  });

  it("does not redirect at all when the sign-in failed", async () => {
    mocks.authenticate.mockResolvedValue({ ok: false, reason: "invalid_credentials" });

    const { redirectedTo } = await run({ ...credentials, next: "/admin/users" });

    expect(redirectedTo).toBeNull();
  });
});

describe("failed sign-ins", () => {
  it("shows one generic message for bad credentials and re-fills only the email", async () => {
    mocks.authenticate.mockResolvedValue({ ok: false, reason: "invalid_credentials" });

    const { state } = await run(credentials);

    expect(state).toEqual({
      status: "error",
      code: "invalid_credentials",
      message: "The email or password is incorrect.",
      email: "admin@example.com",
    });
  });

  it("never puts the password in the returned state", async () => {
    mocks.authenticate.mockResolvedValue({ ok: false, reason: "invalid_credentials" });

    const { state } = await run(credentials);

    expect(JSON.stringify(state)).not.toContain(PASSWORD);
  });

  it("says nothing that tells an unknown email from a wrong password", async () => {
    // authenticate() reports both the same way; the action must not add a difference.
    mocks.authenticate.mockResolvedValue({ ok: false, reason: "invalid_credentials" });
    const unknown = await run({ email: "nobody@example.com", password: "x".repeat(20) });
    const wrong = await run({ email: "admin@example.com", password: "y".repeat(20) });

    expect(unknown.state).toMatchObject({ message: "The email or password is incorrect." });
    expect(unknown.state?.status === "error" && unknown.state.message).toBe(
      wrong.state?.status === "error" && wrong.state.message,
    );
  });

  it("gives a locked account its own message with a retry hint", async () => {
    mocks.authenticate.mockResolvedValue({ ok: false, reason: "locked" });

    const { state } = await run(credentials);

    expect(state).toMatchObject({ status: "error", code: "locked" });
    expect(state?.status === "error" && state.message).toMatch(/locked.*15 minutes/i);
  });

  it("gives rate limiting its own message with a retry hint", async () => {
    mocks.authenticate.mockResolvedValue({ ok: false, reason: "rate_limited" });

    const { state } = await run(credentials);

    expect(state).toMatchObject({ status: "error", code: "rate_limited" });
    expect(state?.status === "error" && state.message).toMatch(/too many.*15 minutes/i);
  });
});

describe("input validation", () => {
  it("asks for what is missing without contacting the database", async () => {
    const { state } = await run({ email: "", password: "" });

    expect(state).toMatchObject({
      status: "error",
      code: "invalid_input",
      fieldErrors: {
        email: "Enter your email address.",
        password: "Enter your password.",
      },
    });
    expect(mocks.authenticate).not.toHaveBeenCalled();
  });

  it("treats absent fields like empty ones", async () => {
    const { state } = await run({});

    expect(state).toMatchObject({ code: "invalid_input" });
    expect(mocks.authenticate).not.toHaveBeenCalled();
  });

  it("bounds the password length so one request cannot ask for unbounded hashing", async () => {
    const { state } = await run({ ...credentials, password: "p".repeat(1025) });

    expect(state).toMatchObject({ code: "invalid_input" });
    expect(mocks.authenticate).not.toHaveBeenCalled();
  });

  it("keeps the typed email when only the password is missing", async () => {
    const { state } = await run({ email: "admin@example.com", password: "" });

    expect(state).toMatchObject({
      email: "admin@example.com",
      fieldErrors: { password: expect.any(String) },
    });
  });
});

describe("database problems", () => {
  it("says the admin needs a database when DATABASE_URL is missing, and does not try", async () => {
    mocks.isDatabaseConfigured.mockReturnValue(false);

    const { state } = await run(credentials);

    expect(state).toMatchObject({
      status: "error",
      code: "not_configured",
      message: "The admin area needs a database connection (DATABASE_URL). See docs/DATABASE.md.",
    });
    expect(mocks.authenticate).not.toHaveBeenCalled();
  });

  it("reports an outage during authentication as an outage, not as bad credentials", async () => {
    mocks.authenticate.mockRejectedValue(
      new DatabaseUnavailableError("down", { cause: "connection" }),
    );

    const { state } = await run(credentials);

    expect(state).toMatchObject({ status: "error", code: "unavailable" });
    expect(mocks.logError).not.toHaveBeenCalled();
  });

  it("reports an outage while creating the session the same way", async () => {
    mocks.createSession.mockRejectedValue(
      new DatabaseUnavailableError("down", { cause: "timeout" }),
    );

    const { state, redirectedTo } = await run(credentials);

    expect(state).toMatchObject({ code: "unavailable" });
    expect(redirectedTo).toBeNull();
  });
});

describe("unexpected errors", () => {
  it("answers with a reference, logs the cause, and leaks neither the password nor the error", async () => {
    const failure = new Error("boom: could not hash Sup3r-secret-Passw0rd!");
    mocks.authenticate.mockRejectedValue(failure);

    const { state } = await run(credentials);

    expect(state).toMatchObject({ status: "error", code: "internal" });
    const message = state?.status === "error" ? state.message : "";
    expect(message).toMatch(
      /^Sign-in failed because of an unexpected error\. Reference: [0-9A-F]{8}\.$/,
    );
    expect(JSON.stringify(state)).not.toMatch(/boom|Sup3r/);
    expect(mocks.logError).toHaveBeenCalledWith(
      "admin.login_failed",
      expect.objectContaining({ reference: message.match(/[0-9A-F]{8}/)?.[0], error: failure }),
    );
  });
});
