import { defineConfig } from "prisma/config";
import { loadEnvFiles } from "./scripts/load-env-files";

// The Prisma 7 CLI does not read .env files itself.
loadEnvFiles();

// `generate`, `validate`, `format` and `migrate diff` (schema vs schema) never open a connection (and `npm install` runs generate), so
// they may run without DATABASE_URL. Every other command targets a real database: refuse to fall
// back to a fake URL, so `migrate deploy` can never silently aim at localhost.
const OFFLINE_COMMANDS = new Set([
  "generate",
  "validate",
  "format",
  "diff",
  "version",
  "--version",
  "-v",
]);
const isOfflineCommand = process.argv.some((arg) => OFFLINE_COMMANDS.has(arg));

const OFFLINE_PLACEHOLDER_URL =
  "sqlserver://localhost:1433;database=shaheen_sky;user=sa;password=placeholder;encrypt=true;trustServerCertificate=true";

function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (url) return url;
  if (isOfflineCommand) return OFFLINE_PLACEHOLDER_URL;
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and set it (see docs/DATABASE.md).",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: resolveDatabaseUrl(),
  },
});
