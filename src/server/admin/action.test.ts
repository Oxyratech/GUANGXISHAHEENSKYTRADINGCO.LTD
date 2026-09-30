// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { DatabaseUnavailableError } from "@/server/db/errors";
import type { AuthSession } from "@/server/auth/session";

const mocks = vi.hoisted(() => ({
  requirePermissionOrThrow: vi.fn(),
  writeAudit: vi.fn(),
  getRequestContext: vi.fn(),
  logError: vi.fn(),
}));

// Next's redirect() aborts rendering by throwing; the action must let that through.
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

import { AuthenticationError, AuthorizationError } from "@/server/auth/authorize";
import {
  ADMIN_ACTION_MESSAGES,
  AdminActionError,
  checkbox,
  defineAdminAction,
  defineAdminInputAction,
  formDataToObject,
  id,
  optionalString,
  requiredString,
  stringList,
  version,
} from "./action";
import { ConflictError } from "./concurrency";

const IP_HASH = "a".repeat(64);
const session: AuthSession = {
  sessionId: "s1",
  user: { id: "u1", email: "admin@example.com", name: "Admin" },
  roles: ["ADMIN"],
  permissions: new Set(["product:write", "product:publish"]),
};

const schema = z.object({ title: requiredString(20), note: optionalString(50) });

function form(entries: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return data;
}

beforeEach(() => {
  mocks.requirePermissionOrThrow.mockReset().mockResolvedValue(session);
  mocks.writeAudit.mockReset().mockResolvedValue(undefined);
  mocks.logError.mockReset();
  mocks.getRequestContext
    .mockReset()
    .mockResolvedValue({ ip: "203.0.113.9", ipHash: IP_HASH, userAgent: "UA", origin: null });
});

describe("authorisation", () => {
  it("answers 'session expired' when nobody is signed in, and never runs the handler", async () => {
    mocks.requirePermissionOrThrow.mockRejectedValue(new AuthenticationError());
    const handler = vi.fn();
    const action = defineAdminAction({ permission: "product:write", schema, handler });

    const state = await action(undefined, form({ title: "x" }));

    expect(state).toMatchObject({
      status: "error",
      code: "unauthenticated",
      message: ADMIN_ACTION_MESSAGES.unauthenticated,
    });
    expect(state.status === "error" && state.message).toMatch(/^Your session has expired/);
    expect(handler).not.toHaveBeenCalled();
    expect(mocks.writeAudit).not.toHaveBeenCalled();
  });

  it("answers 'no permission' for a signed-in user without it", async () => {
    mocks.requirePermissionOrThrow.mockRejectedValue(new AuthorizationError("product:write"));
    const handler = vi.fn();
    const action = defineAdminAction({ permission: "product:write", schema, handler });

    const state = await action(undefined, form({ title: "x" }));

    expect(state).toMatchObject({
      status: "error",
      code: "forbidden",
      message: "You do not have permission to do this.",
    });
    expect(handler).not.toHaveBeenCalled();
    expect(mocks.writeAudit).not.toHaveBeenCalled();
  });

  it("checks permission before validating, so an outsider learns nothing about the schema", async () => {
    mocks.requirePermissionOrThrow.mockRejectedValue(new AuthenticationError());
    const action = defineAdminAction({
      permission: "product:write",
      schema,
      handler: vi.fn(),
    });

    const state = await action(undefined, form({}));

    expect(state).toMatchObject({ code: "unauthenticated" });
    expect(state).not.toHaveProperty("fieldErrors");
  });

  it("requires every permission when several are listed", async () => {
    const handler = vi.fn().mockResolvedValue({ data: null });
    const action = defineAdminAction({
      permission: ["product:write", "product:publish"],
      schema,
      handler,
    });

    await action(undefined, form({ title: "x" }));
    expect(mocks.requirePermissionOrThrow.mock.calls.map(([p]) => p)).toEqual([
      "product:write",
      "product:publish",
    ]);
    expect(handler).toHaveBeenCalledTimes(1);

    handler.mockClear();
    mocks.requirePermissionOrThrow
      .mockResolvedValueOnce(session)
      .mockRejectedValueOnce(new AuthorizationError("product:publish"));
    const denied = await action(undefined, form({ title: "x" }));

    expect(denied).toMatchObject({ code: "forbidden" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("does not accept an action that requires nothing", async () => {
    const action = defineAdminAction({ permission: [], schema, handler: vi.fn() });

    const state = await action(undefined, form({ title: "x" }));

    expect(state).toMatchObject({ status: "error", code: "internal" });
  });
});

describe("validation", () => {
  it("returns field errors and the submitted text, and does not run the handler", async () => {
    const handler = vi.fn();
    const action = defineAdminAction({ permission: "product:write", schema, handler });

    const state = await action(undefined, form({ title: "", note: "n".repeat(51) }));

    expect(state).toMatchObject({
      status: "error",
      code: "validation",
      message: "Please correct the highlighted fields.",
      fieldErrors: { title: ["Required"], note: ["At most 50 characters"] },
      values: { title: "", note: "n".repeat(51) },
    });
    expect(handler).not.toHaveBeenCalled();
    expect(mocks.writeAudit).not.toHaveBeenCalled();
  });

  it("keys nested errors by their dotted path", async () => {
    const nested = z.object({
      translations: z.array(z.object({ name: requiredString(10) })),
    });
    const action = defineAdminInputAction({
      permission: "product:write",
      schema: nested,
      handler: vi.fn(),
    });

    const state = await action({ translations: [{ name: "ok" }, { name: "" }] });

    expect(state).toMatchObject({ fieldErrors: { "translations.1.name": ["Required"] } });
  });

  it("uses the schema's own message for a problem that belongs to no field", async () => {
    const refined = z
      .object({ a: z.string().optional(), b: z.string().optional() })
      .refine((value) => value.a || value.b, "Provide a or b");
    const action = defineAdminAction({
      permission: "product:write",
      schema: refined,
      handler: vi.fn(),
    });

    const state = await action(undefined, form({}));

    expect(state).toMatchObject({ status: "error", message: "Provide a or b" });
    expect(state).not.toHaveProperty("fieldErrors");
  });

  it("never echoes passwords, tokens or secrets back to the browser", async () => {
    const action = defineAdminAction({
      permission: "product:write",
      schema: z.object({ title: requiredString(), password: z.string().min(12) }),
      handler: vi.fn(),
    });

    const state = await action(
      undefined,
      form({ title: "", password: "short", apiToken: "abc", clientSecret: "def" }),
    );

    expect(state.status === "error" && state.values).toEqual({ title: "" });
    expect(JSON.stringify(state)).not.toMatch(/short|abc|def/);
  });

  it("echoes repeated fields as arrays", async () => {
    const action = defineAdminAction({
      permission: "product:write",
      schema: z.object({ tags: stringList(), title: requiredString() }),
      handler: vi.fn(),
    });

    const state = await action(undefined, form({ tags: ["a", "b"], title: "" }));

    expect(state.status === "error" && state.values).toEqual({ tags: ["a", "b"], title: "" });
  });
});

describe("the handler", () => {
  it("receives the parsed input, the session and the hashed request details only", async () => {
    const handler = vi.fn().mockResolvedValue({ data: { id: "p1" } });
    const action = defineAdminAction({ permission: "product:write", schema, handler });

    const state = await action(undefined, form({ title: "  Kettle  ", note: "" }));

    expect(state).toEqual({ status: "success", data: { id: "p1" } });
    const context = handler.mock.calls[0][0];
    expect(context.input).toEqual({ title: "Kettle", note: undefined });
    expect(context.session).toBe(session);
    expect(context.request).toEqual({ ipHash: IP_HASH, userAgent: "UA" });
    expect(JSON.stringify(context.request)).not.toContain("203.0.113.9");
  });

  it("carries the handler's success message", async () => {
    const action = defineAdminAction({
      permission: "product:write",
      schema,
      handler: async () => ({ data: 1, message: "Product published" }),
    });

    await expect(action(undefined, form({ title: "x" }))).resolves.toEqual({
      status: "success",
      data: 1,
      message: "Product published",
    });
  });
});

describe("audit", () => {
  it("writes the entry after the handler, attributed to the user and their hashed address", async () => {
    const order: string[] = [];
    mocks.writeAudit.mockImplementation(async () => void order.push("audit"));
    const action = defineAdminAction({
      permission: "product:write",
      schema,
      handler: async () => {
        order.push("handler");
        return {
          data: null,
          audit: {
            action: "product.updated",
            entityType: "product",
            entityId: "p1",
            summary: "Renamed",
            metadata: { field: "title" },
          },
        };
      },
    });

    await action(undefined, form({ title: "x" }));

    expect(order).toEqual(["handler", "audit"]);
    expect(mocks.writeAudit).toHaveBeenCalledWith({
      action: "product.updated",
      entityType: "product",
      entityId: "p1",
      summary: "Renamed",
      metadata: { field: "title" },
      actor: { id: "u1", email: "admin@example.com" },
      ipHash: IP_HASH,
    });
  });

  it("writes several entries in order", async () => {
    const action = defineAdminAction({
      permission: "product:write",
      schema,
      handler: async () => ({
        data: null,
        audit: [
          { action: "a.first", entityType: "x" },
          { action: "a.second", entityType: "x" },
        ],
      }),
    });

    await action(undefined, form({ title: "x" }));

    expect(mocks.writeAudit.mock.calls.map(([entry]) => entry.action)).toEqual([
      "a.first",
      "a.second",
    ]);
  });

  it("writes nothing when the handler fails", async () => {
    const action = defineAdminAction({
      permission: "product:write",
      schema,
      handler: async () => {
        throw new ConflictError();
      },
    });

    await action(undefined, form({ title: "x" }));

    expect(mocks.writeAudit).not.toHaveBeenCalled();
  });

  it("does not require an audit entry", async () => {
    const action = defineAdminAction({
      permission: "product:write",
      schema,
      handler: async () => ({ data: null }),
    });

    await action(undefined, form({ title: "x" }));

    expect(mocks.writeAudit).not.toHaveBeenCalled();
  });
});

describe("failure mapping", () => {
  function failing(error: unknown) {
    return defineAdminAction({
      name: "test.action",
      permission: "product:write",
      schema,
      handler: async () => {
        throw error;
      },
    });
  }

  it("maps a concurrency conflict to the reload message", async () => {
    const state = await failing(new ConflictError())(undefined, form({ title: "x" }));

    expect(state).toMatchObject({
      status: "error",
      code: "conflict",
      message: "This record was changed by someone else. Reload and try again.",
    });
  });

  it("maps a database outage to an honest message", async () => {
    const state = await failing(new DatabaseUnavailableError("down", { cause: "connection" }))(
      undefined,
      form({ title: "x" }),
    );

    expect(state).toMatchObject({
      code: "unavailable",
      message: ADMIN_ACTION_MESSAGES.unavailable,
    });
    expect(mocks.logError).not.toHaveBeenCalled();
  });

  it("recognises a raw connection failure from the driver as an outage", async () => {
    const state = await failing(
      Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" }),
    )(undefined, form({ title: "x" }));

    expect(state).toMatchObject({ code: "unavailable" });
  });

  it("maps a unique-constraint violation to a plain message", async () => {
    const state = await failing(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
    )(undefined, form({ title: "x" }));

    expect(state).toMatchObject({ code: "rejected", message: ADMIN_ACTION_MESSAGES.duplicate });
  });

  it("maps a missing record to a reload hint", async () => {
    const state = await failing(Object.assign(new Error("not found"), { code: "P2025" }))(
      undefined,
      form({ title: "x" }),
    );

    expect(state).toMatchObject({ code: "conflict", message: ADMIN_ACTION_MESSAGES.missing });
  });

  it("passes a deliberate refusal through, with its field errors and without logging it", async () => {
    const state = await failing(
      new AdminActionError("That slug is already in use.", { slug: ["Already in use"] }),
    )(undefined, form({ title: "x" }));

    expect(state).toMatchObject({
      status: "error",
      code: "rejected",
      message: "That slug is already in use.",
      fieldErrors: { slug: ["Already in use"] },
      values: { title: "x" },
    });
    expect(mocks.logError).not.toHaveBeenCalled();
  });

  it("hides an unexpected error behind a reference that matches the log", async () => {
    const secret = new Error("Login failed for user 'sa' at 10.0.0.5 with password hunter2");
    const state = await failing(secret)(undefined, form({ title: "x" }));

    expect(state.status).toBe("error");
    if (state.status !== "error") return;
    expect(state.code).toBe("internal");
    expect(state.reference).toMatch(/^[0-9A-F]{8}$/);
    expect(state.message).toBe(`${ADMIN_ACTION_MESSAGES.internal} Reference: ${state.reference}.`);
    expect(JSON.stringify(state)).not.toMatch(/Login failed|hunter2|10\.0\.0\.5/);

    expect(mocks.logError).toHaveBeenCalledWith(
      "admin.action_failed",
      expect.objectContaining({
        reference: state.reference,
        action: "test.action",
        userId: "u1",
        error: secret,
      }),
    );
  });

  it("lets a redirect thrown by the handler through instead of reporting it as a failure", async () => {
    const action = failing(new RedirectSignal("/admin/products"));

    await expect(action(undefined, form({ title: "x" }))).rejects.toBeInstanceOf(RedirectSignal);
    expect(mocks.logError).not.toHaveBeenCalled();
    expect(mocks.writeAudit).not.toHaveBeenCalled();
  });
});

describe("defineAdminInputAction", () => {
  it("runs the same pipeline for an object argument", async () => {
    const handler = vi.fn().mockResolvedValue({
      data: "done",
      audit: { action: "product.archived", entityType: "product", entityId: "p1" },
    });
    const action = defineAdminInputAction({
      permission: "product:write",
      schema: z.object({ id, version }),
      handler,
    });

    const state = await action({ id: "00000000-0000-0000-0000-000000000001", version: "3" });

    expect(state).toEqual({ status: "success", data: "done" });
    expect(handler.mock.calls[0][0].input).toEqual({
      id: "00000000-0000-0000-0000-000000000001",
      version: 3,
    });
    expect(mocks.writeAudit).toHaveBeenCalledTimes(1);
  });

  it("validates the argument and does not echo it back", async () => {
    const action = defineAdminInputAction({
      permission: "product:write",
      schema: z.object({ id, version }),
      handler: vi.fn(),
    });

    const state = await action({ id: "not-a-guid", version: "" });

    expect(state).toMatchObject({
      status: "error",
      code: "validation",
      fieldErrors: { id: ["Invalid id"], version: [expect.any(String)] },
    });
    expect(state).not.toHaveProperty("values");
  });

  it("is authorised like the form variant", async () => {
    mocks.requirePermissionOrThrow.mockRejectedValue(new AuthenticationError());
    const action = defineAdminInputAction({
      permission: "product:write",
      schema: z.object({}),
      handler: vi.fn(),
    });

    await expect(action({})).resolves.toMatchObject({ code: "unauthenticated" });
  });
});

describe("formDataToObject", () => {
  it("turns a repeated key into an array and a single key into a value", () => {
    const data = form({ title: "x", tags: ["a", "b", "c"] });

    expect(formDataToObject(data)).toEqual({ title: "x", tags: ["a", "b", "c"] });
  });

  it("drops React's own $ACTION_ bookkeeping fields", () => {
    const data = form({ title: "x", $ACTION_REF_1: "", "$ACTION_1:0": "{}", $ACTION_KEY: "k" });

    expect(formDataToObject(data)).toEqual({ title: "x" });
  });

  it("ignores keys that could poison object prototypes", () => {
    // An object literal would treat __proto__ as the prototype, so append the keys one by one.
    const data = new FormData();
    for (const key of ["__proto__", "constructor", "prototype", "ok"]) data.append(key, "1");

    const result = formDataToObject(data);

    expect(result).toEqual({ ok: "1" });
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("keeps uploaded files as files", () => {
    const data = new FormData();
    data.append("file", new File(["abc"], "a.txt", { type: "text/plain" }));

    expect(formDataToObject(data).file).toBeInstanceOf(File);
  });
});

describe("zod helpers", () => {
  it("id accepts a SQL Server GUID that is not an RFC 4122 UUID", () => {
    expect(id.safeParse("00000000-0000-0000-0000-00000000000A").success).toBe(true);
    expect(id.safeParse("6F9619FF-8B86-D011-B42D-00C04FC964FF").success).toBe(true);
    expect(id.safeParse("not-a-guid").success).toBe(false);
    expect(id.safeParse("").success).toBe(false);
  });

  it("version reads a number from text and refuses blank or junk", () => {
    expect(version.parse("0")).toBe(0);
    expect(version.parse("12")).toBe(12);
    for (const bad of ["", "  ", "abc", "-1", "1.5", undefined, "99999999999"]) {
      expect(version.safeParse(bad).success).toBe(false);
    }
  });

  it("requiredString trims and rejects blank or missing", () => {
    const field = requiredString(5);
    expect(field.parse("  ab ")).toBe("ab");
    expect(field.safeParse("   ").success).toBe(false);
    expect(field.safeParse(undefined).success).toBe(false);
    expect(field.safeParse("abcdef").success).toBe(false);
  });

  it("optionalString turns blank into undefined", () => {
    const field = optionalString(5);
    expect(field.parse("")).toBeUndefined();
    expect(field.parse("   ")).toBeUndefined();
    expect(field.parse(undefined)).toBeUndefined();
    expect(field.parse(" ab ")).toBe("ab");
    expect(field.safeParse("abcdef").success).toBe(false);
  });

  it("checkbox is true only when present", () => {
    expect(checkbox.parse("on")).toBe(true);
    expect(checkbox.parse("true")).toBe(true);
    expect(checkbox.parse(undefined)).toBe(false);
    expect(checkbox.parse("off")).toBe(false);
  });

  it("stringList always yields an array", () => {
    const field = stringList();
    expect(field.parse(undefined)).toEqual([]);
    expect(field.parse("a")).toEqual(["a"]);
    expect(field.parse(["a", "b"])).toEqual(["a", "b"]);
    expect(field.safeParse(["a", ""]).success).toBe(false);
  });
});
