// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminActionError } from "@/server/admin/action";
import {
  assertNotLastActiveSuperAdmin,
  assertNotSelfDeactivation,
  assertNotSelfSuperAdminRemoval,
  assertSuperAdminRoleChangeAllowed,
  isSuperAdminRoleChange,
} from "./guards";

describe("isSuperAdminRoleChange", () => {
  it("is true only when SUPER_ADMIN membership flips", () => {
    expect(isSuperAdminRoleChange(["ADMIN"], ["ADMIN", "SUPER_ADMIN"])).toBe(true);
    expect(isSuperAdminRoleChange(["SUPER_ADMIN"], ["ADMIN"])).toBe(true);
    expect(isSuperAdminRoleChange(["SUPER_ADMIN"], ["SUPER_ADMIN", "ADMIN"])).toBe(false);
    expect(isSuperAdminRoleChange(["ADMIN"], ["SALES_MANAGER"])).toBe(false);
  });
});

describe("assertSuperAdminRoleChangeAllowed", () => {
  it("refuses a non-Super-Admin actor granting the role", () => {
    expect(() =>
      assertSuperAdminRoleChangeAllowed({
        actorRoleKeys: ["ADMIN"],
        currentRoleKeys: ["ADMIN"],
        nextRoleKeys: ["ADMIN", "SUPER_ADMIN"],
      }),
    ).toThrow(AdminActionError);
  });

  it("refuses a non-Super-Admin actor revoking the role", () => {
    expect(() =>
      assertSuperAdminRoleChangeAllowed({
        actorRoleKeys: ["ADMIN"],
        currentRoleKeys: ["SUPER_ADMIN"],
        nextRoleKeys: ["ADMIN"],
      }),
    ).toThrow(AdminActionError);
  });

  it("allows a Super Admin actor to grant or revoke it", () => {
    expect(() =>
      assertSuperAdminRoleChangeAllowed({
        actorRoleKeys: ["SUPER_ADMIN"],
        currentRoleKeys: ["ADMIN"],
        nextRoleKeys: ["ADMIN", "SUPER_ADMIN"],
      }),
    ).not.toThrow();
  });

  it("allows a change that does not touch SUPER_ADMIN, from any actor", () => {
    expect(() =>
      assertSuperAdminRoleChangeAllowed({
        actorRoleKeys: ["ADMIN"],
        currentRoleKeys: ["SALES_MANAGER"],
        nextRoleKeys: ["CONTENT_MANAGER"],
      }),
    ).not.toThrow();
  });
});

describe("assertNotSelfSuperAdminRemoval", () => {
  it("refuses a Super Admin removing their own Super Admin role", () => {
    expect(() =>
      assertNotSelfSuperAdminRemoval({
        isSelf: true,
        currentRoleKeys: ["SUPER_ADMIN"],
        nextRoleKeys: ["ADMIN"],
      }),
    ).toThrow(AdminActionError);
  });

  it("allows a Super Admin removing someone else's Super Admin role", () => {
    expect(() =>
      assertNotSelfSuperAdminRemoval({
        isSelf: false,
        currentRoleKeys: ["SUPER_ADMIN"],
        nextRoleKeys: ["ADMIN"],
      }),
    ).not.toThrow();
  });

  it("allows keeping your own Super Admin role while changing other roles", () => {
    expect(() =>
      assertNotSelfSuperAdminRemoval({
        isSelf: true,
        currentRoleKeys: ["SUPER_ADMIN"],
        nextRoleKeys: ["SUPER_ADMIN", "ADMIN"],
      }),
    ).not.toThrow();
  });
});

describe("assertNotSelfDeactivation", () => {
  it("refuses deactivating your own account", () => {
    expect(() => assertNotSelfDeactivation({ isSelf: true, nextActive: false })).toThrow(
      AdminActionError,
    );
  });

  it("allows deactivating someone else's account", () => {
    expect(() => assertNotSelfDeactivation({ isSelf: false, nextActive: false })).not.toThrow();
  });

  it("allows any change that keeps your own account active", () => {
    expect(() => assertNotSelfDeactivation({ isSelf: true, nextActive: true })).not.toThrow();
  });
});

describe("assertNotLastActiveSuperAdmin", () => {
  function db(count: number) {
    return { user: { count: vi.fn().mockResolvedValue(count) } };
  }

  beforeEach(() => vi.clearAllMocks());

  it("does nothing for a target who never held Super Admin", async () => {
    const database = db(0);
    await expect(
      assertNotLastActiveSuperAdmin(database as never, {
        targetUserId: "u1",
        currentRoleKeys: ["ADMIN"],
        nextActive: false,
        nextRoleKeys: [],
      }),
    ).resolves.toBeUndefined();
    expect(database.user.count).not.toHaveBeenCalled();
  });

  it("does nothing when the target stays an active Super Admin", async () => {
    const database = db(0);
    await expect(
      assertNotLastActiveSuperAdmin(database as never, {
        targetUserId: "u1",
        currentRoleKeys: ["SUPER_ADMIN"],
        nextActive: true,
        nextRoleKeys: ["SUPER_ADMIN"],
      }),
    ).resolves.toBeUndefined();
    expect(database.user.count).not.toHaveBeenCalled();
  });

  it("allows deactivating a Super Admin when another one remains", async () => {
    const database = db(1);
    await expect(
      assertNotLastActiveSuperAdmin(database as never, {
        targetUserId: "u1",
        currentRoleKeys: ["SUPER_ADMIN"],
        nextActive: false,
        nextRoleKeys: ["SUPER_ADMIN"],
      }),
    ).resolves.toBeUndefined();
    expect(database.user.count).toHaveBeenCalledWith({
      where: {
        id: { not: "u1" },
        isActive: true,
        roles: { some: { role: { key: "SUPER_ADMIN" } } },
      },
    });
  });

  it("refuses deactivating the last active Super Admin", async () => {
    const database = db(0);
    await expect(
      assertNotLastActiveSuperAdmin(database as never, {
        targetUserId: "u1",
        currentRoleKeys: ["SUPER_ADMIN"],
        nextActive: false,
        nextRoleKeys: ["SUPER_ADMIN"],
      }),
    ).rejects.toBeInstanceOf(AdminActionError);
  });

  it("refuses demoting the last active Super Admin out of the role", async () => {
    const database = db(0);
    await expect(
      assertNotLastActiveSuperAdmin(database as never, {
        targetUserId: "u1",
        currentRoleKeys: ["SUPER_ADMIN"],
        nextActive: true,
        nextRoleKeys: ["ADMIN"],
      }),
    ).rejects.toBeInstanceOf(AdminActionError);
  });
});
