// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseUnavailableError } from "@/server/db/errors";

const mocks = vi.hoisted(() => {
  const db = { contactMessage: { findUnique: vi.fn() } };
  return { db, getDb: vi.fn(() => db) };
});

vi.mock("@/server/db", () => ({ getDb: mocks.getDb }));

import { getContactMessageDetail } from "./detail";

beforeEach(() => {
  mocks.getDb.mockReset().mockReturnValue(mocks.db);
  mocks.db.contactMessage.findUnique.mockReset();
});

describe("getContactMessageDetail", () => {
  it("returns null for an unknown id", async () => {
    mocks.db.contactMessage.findUnique.mockResolvedValue(null);
    await expect(getContactMessageDetail("missing")).resolves.toBeNull();
  });

  it("returns the row it is given", async () => {
    const row = {
      id: "c1",
      referenceCode: "CTM-1",
      status: "NEW",
      name: "Jane",
      company: null,
      email: "jane@example.com",
      phone: null,
      country: "CN",
      message: "Hello",
      locale: "en",
      consentAcceptedAt: new Date("2026-06-01T00:00:00Z"),
      createdAt: new Date("2026-06-01T00:00:00Z"),
      updatedAt: new Date("2026-06-01T00:00:00Z"),
      handledBy: null,
    };
    mocks.db.contactMessage.findUnique.mockResolvedValue(row);

    await expect(getContactMessageDetail("c1")).resolves.toEqual(row);
  });

  it("never selects an ip hash", async () => {
    await getContactMessageDetail("c1");
    expect(mocks.db.contactMessage.findUnique.mock.calls[0][0].select).not.toHaveProperty("ipHash");
  });

  it("normalises a connection failure", async () => {
    mocks.db.contactMessage.findUnique.mockRejectedValue(
      Object.assign(new Error("x"), { code: "ETIMEDOUT" }),
    );
    await expect(getContactMessageDetail("c1")).rejects.toBeInstanceOf(DatabaseUnavailableError);
  });
});
