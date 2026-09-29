/**
 * `npm run admin:create -- --email you@example.com --name "Your Name" [--role SUPER_ADMIN]`
 *
 * Creates an admin user, or resets the password/role of an existing one. The password is read with
 * hidden input (typed twice), or from ADMIN_PASSWORD for CI; it is never accepted as a flag (shell
 * history) and never printed. Roles must already exist: run `npm run db:seed` first.
 *
 * Run by tsx outside Next.js, so it must not import modules marked `server-only`.
 */
import { PrismaMssql } from "@prisma/adapter-mssql";
import { parseArgs } from "node:util";
import { PrismaClient } from "@/generated/prisma/client";
import { upsertAdminUser, validateAdminUserInput } from "@/server/auth/admin-user";
import { ROLE_KEYS } from "@/server/auth/permissions";
import { isDatabaseUnavailableError } from "@/server/db/errors";
import { loadEnvFiles } from "./load-env-files";

const USAGE = `Usage: npm run admin:create -- --email <email> --name <name> [--role <role>]

  --email   Sign-in email (required)
  --name    Display name (required)
  --role    ${ROLE_KEYS.join(" | ")} (default SUPER_ADMIN)

The password is prompted for (hidden). For CI, set ADMIN_PASSWORD in the environment.`;

class CliError extends Error {}

function readHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    if (!stdin.isTTY) {
      reject(new CliError("No terminal to prompt on. Set ADMIN_PASSWORD for non-interactive use."));
      return;
    }

    let value = "";
    const finish = (outcome: () => void) => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
      outcome();
    };
    const onData = (chunk: Buffer) => {
      for (const char of chunk.toString("utf8")) {
        if (char === "\r" || char === "\n" || char === "\x04") return finish(() => resolve(value));
        if (char === "\x03") return finish(() => reject(new CliError("Cancelled.")));
        if (char === "\x7f" || char === "\b") value = value.slice(0, -1);
        else value += char;
      }
    };

    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}

async function obtainPassword(): Promise<string> {
  const fromEnvironment = process.env.ADMIN_PASSWORD;
  if (fromEnvironment) return fromEnvironment;

  const first = await readHidden("Password: ");
  const second = await readHidden("Repeat password: ");
  if (first !== second) throw new CliError("The two passwords do not match.");
  return first;
}

async function main(): Promise<void> {
  loadEnvFiles();

  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      name: { type: "string" },
      role: { type: "string", default: "SUPER_ADMIN" },
      help: { type: "boolean", short: "h" },
    },
    strict: true,
  });
  if (values.help) {
    console.log(USAGE);
    return;
  }
  if (!values.email || !values.name)
    throw new CliError(`--email and --name are required.\n\n${USAGE}`);

  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new CliError("DATABASE_URL is not set (see .env.example for the format).");

  const input = { email: values.email, name: values.name, role: values.role ?? "SUPER_ADMIN" };
  const password = await obtainPassword();

  const validation = validateAdminUserInput({ ...input, password });
  if (!validation.ok)
    throw new CliError(validation.errors.map((message) => `- ${message}`).join("\n"));

  const db = new PrismaClient({ adapter: new PrismaMssql(url) });
  try {
    const result = await upsertAdminUser(db, validation.value);
    if (!result.ok)
      throw new CliError(
        `Role ${validation.value.role} does not exist yet. Run \`npm run db:seed\` first.`,
      );

    console.log(
      `${result.created ? "Created" : "Updated"} ${validation.value.email} with role ${validation.value.role}.` +
        (result.created ? "" : " Password reset and existing sessions revoked."),
    );
  } finally {
    await db.$disconnect().catch(() => undefined);
  }
}

main().catch((error: unknown) => {
  // Operator mistakes and outages print a message only; anything unexpected keeps its stack.
  if (error instanceof CliError) console.error(error.message);
  else if (isDatabaseUnavailableError(error)) {
    console.error(
      "Could not reach the database. Check DATABASE_URL and that the server accepts connections.",
    );
  } else console.error(error);
  process.exitCode = 1;
});
