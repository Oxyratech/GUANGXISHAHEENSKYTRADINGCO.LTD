// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { upsertAdminUser, validateAdminUserInput } from "./admin-user";
import { isPlausibleEmail, normalizeEmail } from "./email";

// upsertAdminUser really hashes (scrypt, 64 MiB), which is slow when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30_000 });

const STRONG = "Correct-horse-9-battery";

describe("normalizeEmail / isPlausibleEmail", () => {
  it("trims and lower-cases", () => {
    expect(normalizeEmail("  Admin@Example.COM ")).toBe("admin@example.com");
  });

  it("accepts ordinary addresses and rejects junk", () => {
    expect(isPlausibleEmail("a@b.co")).toBe(true);
    for (const bad of ["", "plain", "a@b", "a b@c.de", "@x.com", `${"x".repeat(250)}@b.co`]) {
      expect(isPlausibleEmail(bad)).toBe(false);
    }
  });
});

describe("validateAdminUserInput", () => {
  it("normalises and accepts valid input", () => {
    expect(
      validateAdminUserInput({
        email: " Ada@Example.com ",
        name: " Ada ",
        password: STRONG,
        role: "ADMIN",
      }),
    ).toEqual({
      ok: true,
      value: { email: "ada@example.com", name: "Ada", password: STRONG, role: "ADMIN" },
    });
  });

  it("collects every problem", () => {
    const result = validateAdminUserInput({
      email: "nope",
      name: "  ",
      password: "short",
      role: "GOD",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveLength(4);
      expect(result.errors.join(" ")).toContain('Unknown role "GOD"');
    }
  });

  it("applies the password rules, including the email local part", () => {
    const result = validateAdminUserInput({
      email: "rohan.aligondal@example.com",
      name: "Rohan",
      password: "Rohan.Aligondal-2026!",
      role: "SUPER_ADMIN",
    });

    expect(result).toMatchObject({ ok: false, errors: [expect.stringContaining("email")] });
  });
});

describe("upsertAdminUser", () => {
  const tx = {
    user: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    userRole: { deleteMany: vi.fn(), create: vi.fn() },
    session: { deleteMany: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  const db = {
    role: { findUnique: vi.fn() },
    $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  const asClient = () => db as unknown as PrismaClient;
  const value = { email: "ada@example.com", name: "Ada", password: STRONG, role: "ADMIN" as const };

  beforeEach(() => {
    for (const group of [tx.user, tx.userRole, tx.session, tx.auditLog, db.role]) {
      Object.values(group).forEach((fn) => fn.mockReset());
    }
    db.role.findUnique.mockResolvedValue({ id: "role-1" });
  });

  it("creates a new user with a scrypt hash (never the plain password) and the chosen role", async () => {
    tx.user.findUnique.mockResolvedValue(null);
    tx.user.create.mockResolvedValue({ id: "u-new" });

    const result = await upsertAdminUser(asClient(), value);

    expect(result).toEqual({ ok: true, userId: "u-new", created: true });
    const { data } = tx.user.create.mock.calls[0][0];
    expect(data.email).toBe("ada@example.com");
    expect(data.passwordHash).toMatch(/^scrypt\$65536\$8\$2\$/);
    expect(JSON.stringify(tx.user.create.mock.calls)).not.toContain(STRONG);
    expect(tx.userRole.create).toHaveBeenCalledWith({
      data: { userId: "u-new", roleId: "role-1" },
    });
    expect(tx.session.deleteMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create.mock.calls[0][0].data).toMatchObject({
      action: "user.created_via_cli",
      entityType: "user",
      entityId: "u-new",
    });
    expect(JSON.stringify(tx.auditLog.create.mock.calls)).not.toContain(STRONG);
  });

  it("updates an existing user: reactivates, unlocks, replaces roles and revokes sessions", async () => {
    tx.user.findUnique.mockResolvedValue({ id: "u-old" });
    tx.user.update.mockResolvedValue({ id: "u-old" });

    const result = await upsertAdminUser(asClient(), value);

    expect(result).toEqual({ ok: true, userId: "u-old", created: false });
    expect(tx.user.update.mock.calls[0][0]).toMatchObject({
      where: { id: "u-old" },
      data: { name: "Ada", isActive: true, failedLoginCount: 0, lockedUntil: null },
    });
    expect(tx.userRole.deleteMany).toHaveBeenCalledWith({ where: { userId: "u-old" } });
    expect(tx.userRole.create).toHaveBeenCalledWith({
      data: { userId: "u-old", roleId: "role-1" },
    });
    expect(tx.session.deleteMany).toHaveBeenCalledWith({ where: { userId: "u-old" } });
    expect(tx.auditLog.create.mock.calls[0][0].data.action).toBe("user.updated_via_cli");
  });

  it("reports a missing role without writing anything", async () => {
    db.role.findUnique.mockResolvedValue(null);

    await expect(upsertAdminUser(asClient(), value)).resolves.toEqual({
      ok: false,
      error: "role_missing",
    });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
