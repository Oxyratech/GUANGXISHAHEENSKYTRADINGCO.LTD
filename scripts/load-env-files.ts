/**
 * Environment loading for CLI entry points run by tsx (seed, create-admin). Next.js does this for
 * the app itself; tsx does not.
 *
 * Same precedence as Next.js: real environment first, then .env.local, then .env. Never overrides.
 */
export function loadEnvFiles(): void {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(file);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}
