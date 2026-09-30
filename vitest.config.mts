import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts", "prisma/**/*.test.ts"],
    exclude: ["node_modules", "e2e", ".next"],
    css: false,
    server: { deps: { inline: ["next-intl"] } },
    // Running 230+ files' workers at once starves real-timer/userEvent interaction tests (Radix
    // dialogs) on this machine and produces flaky timeouts that never reproduce running a file alone
    // or the whole suite sequentially (verified: 234/234 files green with file parallelism off).
    // Bounding thread count alone did not remove the flakiness, so disable file parallelism outright.
    testTimeout: 15000,
    hookTimeout: 15000,
    fileParallelism: false,
  },
});
