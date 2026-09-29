// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  upsert: vi.fn(),
  deleteMany: vi.fn(),
  transaction: vi.fn(),
  getDb: vi.fn(),
  revalidateTag: vi.fn(),
  writeAudit: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock("@/server/audit", () => ({ writeAudit: mocks.writeAudit }));
vi.mock("@/server/db", async () => ({
  ...(await import("@/server/db/errors")),
  getDb: mocks.getDb,
}));

import { DatabaseUnavailableError } from "@/server/db/errors";
import { getSettings, updateSettings } from "./settings";

const ACTOR = { id: "6f1c1c1e-0000-4000-8000-000000000001", email: "admin@example.com" };

beforeEach(() => {
  mocks.findMany.mockReset().mockResolvedValue([]);
  mocks.upsert.mockReset().mockImplementation((args: unknown) => ({ upsert: args }));
  mocks.deleteMany.mockReset().mockImplementation((args: unknown) => ({ deleteMany: args }));
  mocks.transaction.mockReset().mockResolvedValue([]);
  mocks.revalidateTag.mockReset();
  mocks.writeAudit.mockReset().mockResolvedValue(undefined);
  mocks.getDb.mockReset().mockReturnValue({
    siteSetting: { findMany: mocks.findMany, upsert: mocks.upsert, deleteMany: mocks.deleteMany },
    $transaction: mocks.transaction,
  });
});

describe("getSettings", () => {
  it("returns the stored, valid values of the requested keys", async () => {
    mocks.findMany.mockResolvedValue([
      { key: "contact.email", value: "sales@example.com" },
      { key: "contact.phone", value: "not a number" },
      { key: "legacy.setting", value: "ignored" },
    ]);

    await expect(getSettings(["contact.email", "contact.phone"])).resolves.toEqual({
      "contact.email": "sales@example.com",
    });
    expect(mocks.findMany.mock.calls[0][0].where).toEqual({
      key: { in: ["contact.email", "contact.phone"] },
    });
  });

  it("does not query for an empty key list", async () => {
    await expect(getSettings([])).resolves.toEqual({});
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("reports an unreachable database as DatabaseUnavailableError", async () => {
    mocks.findMany.mockRejectedValue(Object.assign(new Error("refused"), { code: "ECONNREFUSED" }));

    await expect(getSettings(["contact.email"])).rejects.toBeInstanceOf(DatabaseUnavailableError);
  });
});

describe("updateSettings", () => {
  it("saves valid values as public rows in one transaction, then invalidates the cache", async () => {
    const result = await updateSettings(ACTOR, {
      "contact.email": " sales@example.com ",
      "contact.phone": "+86  771 555 0100",
    });

    expect(result).toEqual({
      ok: true,
      updated: ["contact.email", "contact.phone"],
      cleared: [],
    });
    expect(mocks.upsert).toHaveBeenCalledWith({
      where: { key: "contact.email" },
      create: {
        key: "contact.email",
        value: "sales@example.com",
        isPublic: true,
        updatedById: ACTOR.id,
      },
      update: { value: "sales@example.com", isPublic: true, updatedById: ACTOR.id },
    });
    expect(mocks.upsert.mock.calls[1][0].create.value).toBe("+86 771 555 0100");
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.mock.calls[0][0]).toHaveLength(2);
    expect(mocks.revalidateTag).toHaveBeenCalledWith("site-settings", { expire: 0 });
  });

  it("clears a setting when the value is blank or null", async () => {
    const result = await updateSettings(ACTOR, {
      "contact.email": "  ",
      "contact.whatsapp": null,
    });

    expect(result).toEqual({
      ok: true,
      updated: [],
      cleared: ["contact.email", "contact.whatsapp"],
    });
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: { key: { in: ["contact.email", "contact.whatsapp"] } },
    });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("writes nothing when any value is invalid, and says which", async () => {
    const result = await updateSettings(ACTOR, {
      "contact.email": "sales@example.com",
      "contact.phone": "12345",
    });

    expect(result).toEqual({ ok: false, errors: { "contact.phone": "invalid_phone" } });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
    expect(mocks.writeAudit).not.toHaveBeenCalled();
  });

  it("rejects keys it does not know", async () => {
    const result = await updateSettings(ACTOR, { "contact.fax": "+1 555 0100" } as never);

    expect(result).toEqual({ ok: false, errors: { "contact.fax": "unknown_setting" } });
  });

  it("leaves omitted keys alone and does nothing when there is nothing to do", async () => {
    await expect(updateSettings(ACTOR, {})).resolves.toEqual({
      ok: true,
      updated: [],
      cleared: [],
    });
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.writeAudit).not.toHaveBeenCalled();
  });

  it("audits which keys changed, never their values", async () => {
    await updateSettings(ACTOR, {
      "contact.email": "sales@example.com",
      "contact.phone": null,
    });

    expect(mocks.writeAudit).toHaveBeenCalledTimes(1);
    const entry = mocks.writeAudit.mock.calls[0][0];
    expect(entry).toMatchObject({
      actor: ACTOR,
      action: "settings.updated",
      entityType: "settings",
      metadata: { updated: ["contact.email"], cleared: ["contact.phone"] },
    });
    expect(JSON.stringify(entry)).not.toContain("sales@example.com");
  });

  it("surfaces an unreachable database and does not invalidate or audit", async () => {
    mocks.transaction.mockRejectedValue(Object.assign(new Error("timeout"), { code: "ETIMEOUT" }));

    await expect(
      updateSettings(ACTOR, { "contact.email": "sales@example.com" }),
    ).rejects.toBeInstanceOf(DatabaseUnavailableError);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
    expect(mocks.writeAudit).not.toHaveBeenCalled();
  });
});
