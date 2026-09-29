import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONTACT_MESSAGE_STATUSES,
  DOCUMENT_KINDS,
  INQUIRY_STATUSES,
  INQUIRY_STATUS_DEFINITIONS,
  MEDIA_KINDS,
  MEDIA_VISIBILITIES,
  PUBLISH_STATUSES,
  SEO_SCOPES,
} from "@/lib/domain/statuses";

/**
 * The migration SQL is the deployed source of truth for the CHECK constraints and the InquiryStatus
 * rows, while src/lib/domain/statuses.ts is the source for application code. These tests parse the
 * SQL so the two cannot drift apart unnoticed. No database is involved.
 */

const prismaDir = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(prismaDir, "migrations");

const migrationNames = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const sqlFiles = migrationNames.map((name) =>
  readFileSync(join(migrationsDir, name, "migration.sql"), "utf8"),
);
const allSql = sqlFiles.join("\n");
const initSql = readFileSync(join(migrationsDir, "0001_init", "migration.sql"), "utf8");
const schema = readFileSync(join(prismaDir, "schema.prisma"), "utf8");

const EXPECTED_CHECKS: ReadonlyArray<{ table: string; column: string; values: readonly string[] }> =
  [
    { table: "Product", column: "status", values: PUBLISH_STATUSES },
    { table: "NewsArticle", column: "status", values: PUBLISH_STATUSES },
    { table: "MediaAsset", column: "kind", values: MEDIA_KINDS },
    { table: "MediaAsset", column: "visibility", values: MEDIA_VISIBILITIES },
    { table: "ProductDocument", column: "kind", values: DOCUMENT_KINDS },
    { table: "ContactMessage", column: "status", values: CONTACT_MESSAGE_STATUSES },
    { table: "SeoMetadata", column: "scope", values: SEO_SCOPES },
  ];

interface ParsedCheck {
  table: string;
  column: string;
  collation: string | undefined;
  values: string[];
}

const CHECK_PATTERN =
  /ALTER TABLE \[dbo\]\.\[(\w+)\] ADD CONSTRAINT \[\w+\] CHECK \(\[(\w+)\](?: COLLATE (\w+))? IN \(([^)]*)\)\)/g;

/** Later migrations may drop and re-add a constraint; the last definition per column is the live one. */
function parseChecks(sql: string): Map<string, ParsedCheck> {
  const checks = new Map<string, ParsedCheck>();
  for (const [, table, column, collation, list] of sql.matchAll(CHECK_PATTERN)) {
    const values = [...list.matchAll(/N'([^']*)'/g)].map((m) => m[1]);
    checks.set(`${table}.${column}`, { table, column, collation, values });
  }
  return checks;
}

/** table name -> its column definition lines, from the CREATE TABLE statements. */
function parseTables(sql: string): Map<string, string[]> {
  const tables = new Map<string, string[]>();
  for (const [, name, body] of sql.matchAll(
    /CREATE TABLE \[dbo\]\.\[(\w+)\] \(\n([\s\S]*?)\n\);/g,
  )) {
    tables.set(
      name,
      body
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("[")),
    );
  }
  return tables;
}

const tables = parseTables(allSql);
const checks = parseChecks(allSql);

function columnLine(table: string, column: string): string {
  const line = tables.get(table)?.find((l) => l.startsWith(`[${column}] `));
  if (!line) throw new Error(`Column ${table}.${column} not found in the migrations`);
  return line;
}

describe("migration files", () => {
  it("declare the SQL Server provider in the lock file", () => {
    const lock = readFileSync(join(migrationsDir, "migration_lock.toml"), "utf8");
    expect(lock).toMatch(/^provider = "sqlserver"$/m);
  });

  it("each migration directory holds a migration.sql", () => {
    expect(migrationNames.length).toBeGreaterThan(0);
    for (const name of migrationNames) {
      expect(existsSync(join(migrationsDir, name, "migration.sql")), name).toBe(true);
    }
  });

  it("use LF line endings, because Prisma checksums the exact file content", () => {
    for (const sql of sqlFiles) expect(sql).not.toContain("\r");
  });

  it("create a table for every model in schema.prisma and nothing else", () => {
    const models = [...schema.matchAll(/^model (\w+) \{/gm)].map((m) => m[1]).sort();
    expect([...tables.keys()].sort()).toEqual(models);
  });
});

describe("enum CHECK constraints", () => {
  it("cover exactly the string-enum columns declared in statuses.ts", () => {
    expect([...checks.keys()].sort()).toEqual(
      EXPECTED_CHECKS.map((c) => `${c.table}.${c.column}`).sort(),
    );
  });

  it("are all recognised by the parser (no constraint is silently skipped)", () => {
    expect(allSql.match(/\bCHECK\s*\(/g)?.length).toBe(checks.size);
  });

  it.each(EXPECTED_CHECKS)(
    "$table.$column allows exactly the constants, no more and no fewer",
    (expected) => {
      const check = checks.get(`${expected.table}.${expected.column}`);

      expect(check, "constraint missing").toBeDefined();
      expect(new Set(check!.values).size, "duplicate value in the constraint").toBe(
        check!.values.length,
      );
      expect([...check!.values].sort()).toEqual([...expected.values].sort());
    },
  );

  it("compare with a binary collation, so a different case is rejected like in the application", () => {
    for (const check of checks.values()) {
      expect(check.collation, `${check.table}.${check.column}`).toBe("Latin1_General_100_BIN2");
    }
  });

  it("guard columns that exist in the generated tables", () => {
    for (const { table, column } of checks.values()) {
      expect(() => columnLine(table, column), `${table}.${column}`).not.toThrow();
    }
  });

  it("leave room in the column for the longest allowed value", () => {
    for (const check of checks.values()) {
      const width = Number(/NVARCHAR\((\d+)\)/.exec(columnLine(check.table, check.column))?.[1]);
      const longest = Math.max(...check.values.map((v) => v.length));
      expect(longest, `${check.table}.${check.column}`).toBeLessThanOrEqual(width);
    }
  });

  it("only use column defaults that the constraint allows", () => {
    for (const check of checks.values()) {
      const fallback = /DEFAULT '([^']*)'/.exec(columnLine(check.table, check.column))?.[1];
      if (fallback !== undefined)
        expect(check.values, `${check.table}.${check.column}`).toContain(fallback);
    }
  });

  it("are applied inside the migration transaction", () => {
    const lastCommit = initSql.lastIndexOf("COMMIT TRAN;");
    for (const { table, column } of checks.values()) {
      const at = initSql.indexOf(
        `ALTER TABLE [dbo].[${table}] ADD CONSTRAINT [${table}_${column}_check]`,
      );
      expect(at, `${table}.${column}`).toBeGreaterThan(-1);
      expect(at, `${table}.${column}`).toBeLessThan(lastCommit);
    }
  });
});

describe("InquiryStatus lookup rows", () => {
  const ROW_PATTERN = /\(N'([^']*)', N'([^']*)', (\d+), ([01])\)/g;

  function insertedRows() {
    const statements = [...allSql.matchAll(/INSERT INTO \[dbo\]\.\[InquiryStatus\] ([^;]*);/g)];
    return statements.flatMap(([, rest]) =>
      [...rest.matchAll(ROW_PATTERN)].map(([, code, label, sortOrder, isTerminal]) => ({
        code,
        label,
        sortOrder: Number(sortOrder),
        isTerminal: isTerminal === "1",
      })),
    );
  }

  it("insert exactly the 8 lifecycle statuses defined in statuses.ts", () => {
    const rows = insertedRows();

    expect(rows).toHaveLength(8);
    expect(rows.map((r) => r.code).sort()).toEqual([...INQUIRY_STATUSES].sort());
    expect([...rows].sort((a, b) => a.sortOrder - b.sortOrder)).toEqual(
      INQUIRY_STATUS_DEFINITIONS.map((s) => ({ ...s })),
    );
  });

  it("use the column order the parser expects", () => {
    expect(allSql).toContain(
      "INSERT INTO [dbo].[InquiryStatus] ([code], [label], [sortOrder], [isTerminal]) VALUES",
    );
  });

  it("include the default status of new inquiries", () => {
    const fallback = /DEFAULT '([^']*)'/.exec(columnLine("BusinessInquiry", "status"))?.[1];
    expect(INQUIRY_STATUSES).toContain(fallback);
  });

  it("insert before the transaction commits", () => {
    expect(initSql.indexOf("INSERT INTO [dbo].[InquiryStatus]")).toBeLessThan(
      initSql.lastIndexOf("COMMIT TRAN;"),
    );
  });
});
