// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  getDb: vi.fn(),
  isDatabaseConfigured: vi.fn(),
  // unstable_cache needs the Next.js runtime; here it hands back the function it was given.
  unstableCache: vi.fn(<T>(fn: T) => fn),
}));

vi.mock("next/cache", () => ({ unstable_cache: mocks.unstableCache }));
vi.mock("@/server/db", async () => ({
  ...(await import("@/server/db/errors")),
  getDb: mocks.getDb,
  isDatabaseConfigured: mocks.isDatabaseConfigured,
}));

import { DatabaseUnavailableError } from "@/server/db/errors";
import { getPublicContactChannels } from "./contact-channels";

// Recorded at import time, before any test resets the mock.
const [, cacheKeyParts, cacheOptions] = mocks.unstableCache.mock.calls[0] as unknown as [
  unknown,
  string[],
  { revalidate: number; tags: string[] },
];

const CONTACT_ENV = ["CONTACT_EMAIL", "CONTACT_PHONE", "CONTACT_WHATSAPP"] as const;

function storeRows(rows: { key: string; value: string }[]) {
  mocks.findMany.mockResolvedValue(rows);
}

beforeEach(() => {
  for (const name of CONTACT_ENV) vi.stubEnv(name, "");
  mocks.findMany.mockReset().mockResolvedValue([]);
  mocks.getDb.mockReset().mockReturnValue({ siteSetting: { findMany: mocks.findMany } });
  mocks.isDatabaseConfigured.mockReset().mockReturnValue(true);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getPublicContactChannels", () => {
  it("is empty when nothing is configured: no channel is ever invented", async () => {
    expect(await getPublicContactChannels()).toEqual({});
  });

  it("uses the environment when the database holds nothing", async () => {
    vi.stubEnv("CONTACT_EMAIL", "sales@example.com");
    vi.stubEnv("CONTACT_PHONE", "+86 771 555 0100");
    vi.stubEnv("CONTACT_WHATSAPP", "+8613800000000");

    expect(await getPublicContactChannels()).toEqual({
      email: "sales@example.com",
      phone: "+86 771 555 0100",
      whatsapp: "+8613800000000",
    });
  });

  it("prefers the database over the environment, channel by channel", async () => {
    vi.stubEnv("CONTACT_EMAIL", "env@example.com");
    vi.stubEnv("CONTACT_PHONE", "+86 771 555 0100");
    storeRows([
      { key: "contact.email", value: "db@example.com" },
      { key: "contact.whatsapp", value: "+8613900000000" },
    ]);

    expect(await getPublicContactChannels()).toEqual({
      email: "db@example.com",
      phone: "+86 771 555 0100",
      whatsapp: "+8613900000000",
    });
  });

  it("reads only the three contact keys, and only rows flagged public", async () => {
    await getPublicContactChannels();

    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    const query = mocks.findMany.mock.calls[0][0];
    expect(query.where.isPublic).toBe(true);
    expect([...query.where.key.in].sort()).toEqual([
      "contact.email",
      "contact.phone",
      "contact.whatsapp",
    ]);
    expect(Object.keys(query.select).sort()).toEqual(["key", "value"]);
  });

  it("never returns a setting that is not a contact channel", async () => {
    storeRows([
      { key: "contact.email", value: "db@example.com" },
      { key: "internal.notes", value: "private" },
    ]);

    expect(await getPublicContactChannels()).toEqual({ email: "db@example.com" });
  });

  it("drops an invalid stored value and falls back to a valid environment value", async () => {
    vi.stubEnv("CONTACT_EMAIL", "env@example.com");
    storeRows([{ key: "contact.email", value: "not-an-email" }]);

    expect(await getPublicContactChannels()).toEqual({ email: "env@example.com" });
  });

  it("drops invalid values everywhere rather than showing them", async () => {
    vi.stubEnv("CONTACT_EMAIL", "nope");
    vi.stubEnv("CONTACT_PHONE", "0771 555 0100");
    storeRows([{ key: "contact.whatsapp", value: "wa.me/123" }]);

    expect(await getPublicContactChannels()).toEqual({});
  });

  it("falls back to the environment when the database is unavailable, without throwing", async () => {
    vi.stubEnv("CONTACT_EMAIL", "env@example.com");
    mocks.findMany.mockRejectedValue(new DatabaseUnavailableError("down", { cause: "connection" }));

    await expect(getPublicContactChannels()).resolves.toEqual({ email: "env@example.com" });
  });

  it("does not take the site down on an unexpected database error either", async () => {
    vi.stubEnv("CONTACT_PHONE", "+86 771 555 0100");
    mocks.findMany.mockRejectedValue(new Error("Invalid object name 'SiteSetting'"));

    await expect(getPublicContactChannels()).resolves.toEqual({ phone: "+86 771 555 0100" });
  });

  it("does not touch the database when none is configured", async () => {
    mocks.isDatabaseConfigured.mockReturnValue(false);
    vi.stubEnv("CONTACT_EMAIL", "env@example.com");

    expect(await getPublicContactChannels()).toEqual({ email: "env@example.com" });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("is cached for five minutes under the site-settings tag", () => {
    expect(cacheOptions).toEqual({ revalidate: 300, tags: ["site-settings"] });
    expect(cacheKeyParts).toEqual(["public-contact-channels"]);
  });
});
