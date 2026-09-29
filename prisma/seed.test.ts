import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { INQUIRY_STATUS_DEFINITIONS } from "@/lib/domain/statuses";
import { ALL_PERMISSIONS, PERMISSIONS, ROLE_DEFINITIONS } from "@/server/auth/permissions";
import { planAdminSeed } from "./seed-data/admin-user";
import { SeedConfigError } from "./seed-data/errors";
import { seedReferenceData } from "./seed-data/reference-data";
import { runSeed } from "./seed-data/run-seed";
import type { PasswordPolicy, SeedDb } from "./seed-data/types";

type Row = Record<string, unknown>;
type UpsertArgs = { where: Row; create: Row; update: Row };

/**
 * In-memory stand-in for the slice of Prisma the seed uses. Each delegate exposes only the calls the
 * seed is allowed to make (upsert everywhere; findUnique/create/auditLog for the one-off admin), so a stray
 * create/createMany/delete on reference data throws instead of silently duplicating rows.
 */
function createFakeDb() {
  const statuses = new Map<string, Row>();
  const permissions = new Map<string, Row>();
  const roles = new Map<string, Row>();
  const grants = new Map<string, Row>();
  const users = new Map<string, Row>();
  const userRoles: Row[] = [];
  const auditLog: Row[] = [];
  let sequence = 0;

  function upsertInto(table: Map<string, Row>, key: string, args: UpsertArgs, generateId: boolean) {
    const existing = table.get(key);
    if (existing) {
      Object.assign(existing, args.update);
      return existing;
    }
    const row: Row = { ...(generateId ? { id: `id-${++sequence}` } : {}), ...args.create };
    table.set(key, row);
    return row;
  }

  const mocks = {
    inquiryStatus: {
      upsert: vi.fn(async (a: UpsertArgs) => upsertInto(statuses, String(a.where.code), a, false)),
    },
    permission: {
      upsert: vi.fn(async (a: UpsertArgs) => upsertInto(permissions, String(a.where.key), a, true)),
    },
    role: {
      upsert: vi.fn(async (a: UpsertArgs) => upsertInto(roles, String(a.where.key), a, true)),
    },
    rolePermission: {
      upsert: vi.fn(async (a: UpsertArgs) => {
        const { roleId, permissionId } = a.where.roleId_permissionId as Row;
        return upsertInto(grants, `${roleId}:${permissionId}`, a, false);
      }),
    },
    user: {
      findUnique: vi.fn(async (a: { where: Row }) => {
        const user = users.get(String(a.where.email));
        return user ? { id: user.id } : null;
      }),
      create: vi.fn(async (a: { data: Row }) => {
        const { roles: nested, ...fields } = a.data as Row & {
          roles: { create: { roleId: string } };
        };
        const row: Row = { id: `id-${++sequence}`, ...fields };
        users.set(String(fields.email), row);
        userRoles.push({ userId: row.id, roleId: nested.create.roleId });
        return row;
      }),
    },
    auditLog: {
      create: vi.fn(async (a: { data: Row }) => {
        auditLog.push({ ...a.data });
        return { id: `id-${++sequence}` };
      }),
    },
  };
  // Array form only, like the seed: the operations have already run by the time they are passed in.
  const transaction = vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations));

  return {
    db: { ...mocks, $transaction: transaction } as unknown as SeedDb,
    mocks,
    transaction,
    tables: { statuses, permissions, roles, grants, users, userRoles, auditLog },
  };
}

const TEST_PASSWORD = "test-only-Passw0rd-not-a-real-secret";

function createPolicy() {
  const hashPassword = vi.fn(async (plain: string) => `test-hash:${plain.length}`);
  const validatePasswordStrength = vi.fn(
    (plain: string): ReturnType<PasswordPolicy["validatePasswordStrength"]> =>
      plain.length >= 12 ? { ok: true } : { ok: false, reason: "must be at least 12 characters" },
  );
  return {
    policy: { hashPassword, validatePasswordStrength } satisfies PasswordPolicy,
    hashPassword,
    validatePasswordStrength,
  };
}

const grantTotal = ROLE_DEFINITIONS.reduce((sum, role) => sum + role.permissions.length, 0);

describe("seedReferenceData", () => {
  it("writes exactly the code-defined statuses, permissions, roles and grants", async () => {
    const { db, tables } = createFakeDb();

    const summary = await seedReferenceData(db);

    expect([...tables.statuses.values()]).toEqual(
      INQUIRY_STATUS_DEFINITIONS.map((s) => ({ ...s })),
    );
    expect([...tables.permissions.values()].map((p) => [p.key, p.description])).toEqual(
      ALL_PERMISSIONS.map((key) => [key, PERMISSIONS[key]]),
    );
    expect(
      [...tables.roles.values()].map((r) => [r.key, r.name, r.description, r.isSystem]),
    ).toEqual(ROLE_DEFINITIONS.map((r) => [r.key, r.name, r.description, true]));
    expect(tables.grants.size).toBe(grantTotal);
    expect(summary).toMatchObject({
      inquiryStatuses: 8,
      permissions: ALL_PERMISSIONS.length,
      roles: ROLE_DEFINITIONS.length,
      rolePermissions: grantTotal,
    });
  });

  it("links every grant to the role and permission rows it names", async () => {
    const { db, tables } = createFakeDb();

    await seedReferenceData(db);

    const roleByKey = new Map([...tables.roles.values()].map((r) => [r.key, r.id]));
    const permissionByKey = new Map([...tables.permissions.values()].map((p) => [p.key, p.id]));
    const expected = ROLE_DEFINITIONS.flatMap((role) =>
      role.permissions.map((p) => `${roleByKey.get(role.key)}:${permissionByKey.get(p)}`),
    );
    expect([...tables.grants.keys()].sort()).toEqual(expected.sort());
  });

  it("is idempotent: a second run changes no row and creates no duplicate", async () => {
    const { db, tables, mocks } = createFakeDb();

    await seedReferenceData(db);
    const afterFirst = structuredClone({
      statuses: [...tables.statuses],
      permissions: [...tables.permissions],
      roles: [...tables.roles],
      grants: [...tables.grants],
    });
    const upsertsAfterFirst = mocks.rolePermission.upsert.mock.calls.length;
    await seedReferenceData(db);

    expect({
      statuses: [...tables.statuses],
      permissions: [...tables.permissions],
      roles: [...tables.roles],
      grants: [...tables.grants],
    }).toEqual(afterFirst);
    // Every write is an upsert: the second run re-issues exactly the same calls.
    expect(mocks.rolePermission.upsert.mock.calls.length).toBe(upsertsAfterFirst * 2);
    expect(mocks.user.create).not.toHaveBeenCalled();
  });

  it("refreshes labels and descriptions that drifted from the code", async () => {
    const { db, tables } = createFakeDb();
    await seedReferenceData(db);

    tables.statuses.get("NEW")!.label = "Stale label";
    tables.statuses.get("COMPLETED")!.isTerminal = false;
    tables.roles.get("ADMIN")!.description = "Stale description";
    tables.permissions.get("inquiry:read")!.description = "Stale description";
    await seedReferenceData(db);

    expect(tables.statuses.get("NEW")).toMatchObject({ label: "New" });
    expect(tables.statuses.get("COMPLETED")).toMatchObject({ isTerminal: true });
    expect(tables.roles.get("ADMIN")).toMatchObject({
      description: ROLE_DEFINITIONS[1].description,
    });
    expect(tables.permissions.get("inquiry:read")).toMatchObject({
      description: PERMISSIONS["inquiry:read"],
    });
  });

  it("keeps extra grants added elsewhere and restores baseline grants that were removed", async () => {
    const { db, tables } = createFakeDb();
    await seedReferenceData(db);
    const roleId = (key: string) => tables.roles.get(key)!.id;
    const permissionId = (key: string) => tables.permissions.get(key)!.id;

    const extra = `${roleId("CONTENT_MANAGER")}:${permissionId("inquiry:read")}`;
    tables.grants.set(extra, {
      roleId: roleId("CONTENT_MANAGER"),
      permissionId: permissionId("inquiry:read"),
    });
    tables.grants.delete(`${roleId("SALES_MANAGER")}:${permissionId("media:read")}`);
    await seedReferenceData(db);

    expect(tables.grants.has(extra)).toBe(true);
    expect(tables.grants.has(`${roleId("SALES_MANAGER")}:${permissionId("media:read")}`)).toBe(
      true,
    );
    expect(tables.grants.size).toBe(grantTotal + 1);
  });

  it("returns the id of each built-in role", async () => {
    const { db, tables } = createFakeDb();

    const { roleIds } = await seedReferenceData(db);

    for (const role of ROLE_DEFINITIONS) {
      expect(roleIds[role.key]).toBe(tables.roles.get(role.key)!.id);
    }
  });
});

function thrownBy(fn: () => unknown): Error {
  try {
    fn();
  } catch (error) {
    return error as Error;
  }
  throw new Error("Expected the call to throw");
}

describe("planAdminSeed", () => {
  const { policy } = createPolicy();

  it("skips when neither variable is set", () => {
    expect(planAdminSeed({}, policy)).toMatchObject({ action: "skip" });
    expect(
      planAdminSeed({ SEED_ADMIN_EMAIL: "  ", SEED_ADMIN_PASSWORD: "" }, policy),
    ).toMatchObject({
      action: "skip",
    });
  });

  it("skips, naming the missing variable, when only one is set", () => {
    // The state operators are left in after removing SEED_ADMIN_PASSWORD following the first run.
    expect(planAdminSeed({ SEED_ADMIN_EMAIL: "admin@example.com" }, policy)).toEqual({
      action: "skip",
      reason: "SEED_ADMIN_PASSWORD is not set (both are required)",
    });
    expect(planAdminSeed({ SEED_ADMIN_PASSWORD: TEST_PASSWORD }, policy)).toEqual({
      action: "skip",
      reason: "SEED_ADMIN_EMAIL is not set (both are required)",
    });
  });

  it("normalises the email and checks the password against it", () => {
    const { policy: fresh, validatePasswordStrength } = createPolicy();

    const plan = planAdminSeed(
      { SEED_ADMIN_EMAIL: "  Admin@Example.COM ", SEED_ADMIN_PASSWORD: TEST_PASSWORD },
      fresh,
    );

    expect(plan).toEqual({ action: "create", email: "admin@example.com", password: TEST_PASSWORD });
    expect(validatePasswordStrength).toHaveBeenCalledWith(TEST_PASSWORD, "admin@example.com");
  });

  it("rejects an invalid email without echoing the password", () => {
    const error = thrownBy(() =>
      planAdminSeed(
        { SEED_ADMIN_EMAIL: "not-an-email", SEED_ADMIN_PASSWORD: TEST_PASSWORD },
        policy,
      ),
    );

    expect(error).toBeInstanceOf(SeedConfigError);
    expect(error.message).toContain("SEED_ADMIN_EMAIL");
    expect(error.message).not.toContain(TEST_PASSWORD);
  });

  it("rejects a weak password with the policy's reason and never echoes the password", () => {
    const weak = "short-pw";
    const error = thrownBy(() =>
      planAdminSeed({ SEED_ADMIN_EMAIL: "admin@example.com", SEED_ADMIN_PASSWORD: weak }, policy),
    );

    expect(error).toBeInstanceOf(SeedConfigError);
    expect(error.message).toContain("at least 12 characters");
    expect(error.message).not.toContain(weak);
  });
});

describe("runSeed", () => {
  const adminEnv = { SEED_ADMIN_EMAIL: "Admin@Example.com", SEED_ADMIN_PASSWORD: TEST_PASSWORD };

  it("seeds reference data only, and reports the admin as skipped, without admin variables", async () => {
    const { db, tables, mocks } = createFakeDb();
    const { policy, hashPassword } = createPolicy();

    const report = await runSeed(db, {}, policy);

    expect(report.admin).toMatchObject({ outcome: "skipped" });
    expect(tables.users.size).toBe(0);
    expect(mocks.user.findUnique).not.toHaveBeenCalled();
    expect(mocks.auditLog.create).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
    // Nothing besides reference data: the fake exposes no other tables, so any other write would throw.
    expect(
      tables.statuses.size + tables.permissions.size + tables.roles.size + tables.grants.size,
    ).toBe(8 + ALL_PERMISSIONS.length + ROLE_DEFINITIONS.length + grantTotal);
  });

  it("creates the SUPER_ADMIN with a hashed password and the SUPER_ADMIN role", async () => {
    const { db, tables, transaction } = createFakeDb();
    const { policy, hashPassword } = createPolicy();

    const report = await runSeed(db, adminEnv, policy);

    expect(report.admin).toEqual({ outcome: "created" });
    const user = tables.users.get("admin@example.com")!;
    expect(user).toMatchObject({
      email: "admin@example.com",
      passwordHash: `test-hash:${TEST_PASSWORD.length}`,
    });
    expect(hashPassword).toHaveBeenCalledExactlyOnceWith(TEST_PASSWORD);
    expect(tables.userRoles).toEqual([
      { userId: user.id, roleId: tables.roles.get("SUPER_ADMIN")!.id },
    ]);
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("records the creation in the audit log, without secrets", async () => {
    const { db, tables } = createFakeDb();
    const { policy } = createPolicy();

    await runSeed(db, adminEnv, policy);

    const user = tables.users.get("admin@example.com")!;
    expect(tables.auditLog).toEqual([
      expect.objectContaining({
        action: "user.created_via_seed",
        entityType: "user",
        entityId: user.id,
      }),
    ]);
    const serialised = JSON.stringify(tables.auditLog);
    expect(serialised).not.toContain(TEST_PASSWORD);
    expect(serialised).not.toContain("test-hash");
    expect(serialised).not.toContain("admin@example.com");
  });

  it("is idempotent: the second run neither hashes nor creates a second admin", async () => {
    const { db, tables, mocks, transaction } = createFakeDb();
    const { policy, hashPassword } = createPolicy();
    await runSeed(db, adminEnv, policy);
    const snapshot = structuredClone([...tables.users]);

    const second = await runSeed(db, adminEnv, policy);

    expect(second.admin).toEqual({ outcome: "exists" });
    expect(mocks.user.create).toHaveBeenCalledTimes(1);
    expect(hashPassword).toHaveBeenCalledTimes(1);
    expect(tables.users.size).toBe(1);
    expect([...tables.users]).toEqual(snapshot);
    expect(tables.userRoles).toHaveLength(1);
    expect(tables.auditLog).toHaveLength(1);
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("leaves an existing account untouched even when the environment password differs", async () => {
    const { db, tables } = createFakeDb();
    const { policy, hashPassword } = createPolicy();
    tables.users.set("admin@example.com", {
      id: "existing",
      email: "admin@example.com",
      passwordHash: "original-hash",
    });

    const report = await runSeed(
      db,
      { ...adminEnv, SEED_ADMIN_PASSWORD: "a-different-long-password" },
      policy,
    );

    expect(report.admin).toEqual({ outcome: "exists" });
    expect(tables.users.get("admin@example.com")).toEqual({
      id: "existing",
      email: "admin@example.com",
      passwordHash: "original-hash",
    });
    expect(tables.userRoles).toHaveLength(0);
    expect(tables.auditLog).toHaveLength(0);
    expect(hashPassword).not.toHaveBeenCalled();
  });

  it("rejects invalid admin variables before writing anything", async () => {
    const { db, mocks, transaction } = createFakeDb();
    const { policy } = createPolicy();

    await expect(
      runSeed(db, { SEED_ADMIN_EMAIL: "admin@example.com", SEED_ADMIN_PASSWORD: "weak" }, policy),
    ).rejects.toThrow(SeedConfigError);

    for (const delegate of Object.values(mocks)) {
      for (const fn of Object.values(delegate)) expect(fn).not.toHaveBeenCalled();
    }
    expect(transaction).not.toHaveBeenCalled();
  });

  it("never passes the plaintext password to the database or into the report", async () => {
    const { db, mocks } = createFakeDb();
    const { policy } = createPolicy();

    const report = await runSeed(db, adminEnv, policy);

    const dbCalls = Object.values(mocks).flatMap((delegate) =>
      Object.values(delegate).flatMap((fn) => fn.mock.calls),
    );
    expect(JSON.stringify(dbCalls)).not.toContain(TEST_PASSWORD);
    expect(JSON.stringify(report)).not.toContain(TEST_PASSWORD);
  });
});

/** Column width of a String field, read from the schema so this test cannot go stale. */
function columnLength(model: string, field: string): number {
  const schema = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "schema.prisma"),
    "utf8",
  );
  const block = new RegExp(`^model ${model} \\{([\\s\\S]*?)^\\}`, "m").exec(schema)?.[1] ?? "";
  const line = block.split("\n").find((l) => l.trim().startsWith(`${field} `));
  const width = line ? /@db\.NVarChar\((\d+)\)/.exec(line)?.[1] : undefined;
  if (!width) throw new Error(`No NVarChar width found for ${model}.${field}`);
  return Number(width);
}

describe("seed data fits the schema columns", () => {
  it("inquiry statuses", () => {
    for (const status of INQUIRY_STATUS_DEFINITIONS) {
      expect(status.code.length).toBeLessThanOrEqual(columnLength("InquiryStatus", "code"));
      expect(status.label.length).toBeLessThanOrEqual(columnLength("InquiryStatus", "label"));
    }
  });

  it("permissions", () => {
    for (const key of ALL_PERMISSIONS) {
      expect(key.length).toBeLessThanOrEqual(columnLength("Permission", "key"));
      expect(PERMISSIONS[key].length).toBeLessThanOrEqual(
        columnLength("Permission", "description"),
      );
    }
  });

  it("roles", () => {
    for (const role of ROLE_DEFINITIONS) {
      expect(role.key.length).toBeLessThanOrEqual(columnLength("Role", "key"));
      expect(role.name.length).toBeLessThanOrEqual(columnLength("Role", "name"));
      expect(role.description.length).toBeLessThanOrEqual(columnLength("Role", "description"));
    }
  });
});
