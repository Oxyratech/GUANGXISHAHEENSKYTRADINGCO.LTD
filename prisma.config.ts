import { defineConfig } from "prisma/config";

// `prisma generate` and `prisma validate` work without a live database, so a placeholder URL is
// used when DATABASE_URL is unset. Real commands (migrate, seed) require the real value.
const PLACEHOLDER_URL =
  "sqlserver://localhost:1433;database=shaheen_sky;user=sa;password=placeholder;encrypt=true;trustServerCertificate=true";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? PLACEHOLDER_URL,
  },
});
