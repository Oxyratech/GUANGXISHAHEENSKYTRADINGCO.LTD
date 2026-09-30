import "server-only";
import { randomBytes } from "node:crypto";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { writeAudit, type AuditEntry } from "@/server/audit";
import {
  AuthenticationError,
  AuthorizationError,
  requirePermissionOrThrow,
  type AuthSession,
} from "@/server/auth/authorize";
import type { Permission } from "@/server/auth/permissions";
import { DatabaseUnavailableError, toDatabaseError } from "@/server/db/errors";
import { getRequestContext } from "@/server/http/request-context";
import type { AdminActionErrorCode, AdminActionState, AdminFormAction } from "./action-state";
import { CONFLICT_MESSAGE, ConflictError } from "./concurrency";

export type { AdminActionErrorCode, AdminActionState, AdminFormAction } from "./action-state";

/*
 * The one way an admin Server Action is built. It runs the same steps in the same order every time,
 * so no feature can forget one of them:
 *
 *   1. authorise on the server (session, then every listed permission)
 *   2. validate the input with zod (the server is authoritative; the browser's checks are a courtesy)
 *   3. run the handler
 *   4. write the audit entries, only after the handler succeeded
 *   5. turn every failure into a plain state the form can show (never a stack trace, never a raw error)
 *
 *   "use server";
 *   export const publishProduct = defineAdminAction({
 *     permission: "product:publish",
 *     schema: z.object({ id, version }),
 *     handler: async ({ input }) => { ...; return { data: undefined, audit: {...} }; },
 *   });
 */

export type AuditEntryInput = Omit<AuditEntry, "actor" | "ipHash">;

export interface AdminActionContext<S extends z.ZodType> {
  input: z.output<S>;
  session: AuthSession;
  /** The hashed client address and user agent; store `ipHash`, never a raw address. */
  request: { ipHash: string; userAgent: string | null };
}

export interface AdminActionResult<R> {
  /** Returned to the form; keep it small and free of internal fields (it is serialised to the browser). */
  data: R;
  /** Written after success, with the signed-in user as actor. */
  audit?: AuditEntryInput | AuditEntryInput[];
  /** Shown in the success toast; the form supplies a default. */
  message?: string;
}

export interface AdminActionConfig<S extends z.ZodType, R> {
  /** Names the action in the server log when it fails unexpectedly. */
  name?: string;
  /** A list means the user must hold every permission in it. */
  permission: Permission | readonly Permission[];
  schema: S;
  handler: (context: AdminActionContext<S>) => Promise<AdminActionResult<R>>;
}

export const ADMIN_ACTION_MESSAGES = {
  unauthenticated: "Your session has expired. Sign in again to continue.",
  forbidden: "You do not have permission to do this.",
  validation: "Please correct the highlighted fields.",
  invalid: "The submitted data is not valid.",
  conflict: CONFLICT_MESSAGE,
  unavailable: "The database is not available right now, so nothing was saved. Try again shortly.",
  duplicate: "A record with the same unique value already exists.",
  missing: "This record no longer exists. Reload the page.",
  internal: "Something went wrong and nothing was saved.",
} as const;

/**
 * Throw this from a handler for a refusal the user can act on ("that slug is taken"). It becomes an
 * error state with the message and optional field errors, and is not logged as a failure.
 */
export class AdminActionError extends Error {
  readonly fieldErrors: Record<string, string[]> | undefined;

  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "AdminActionError";
    this.fieldErrors = fieldErrors;
  }
}

// ---- Zod helpers for form input ------------------------------------------------------------------
// FormData carries strings only, and a blank text box arrives as "". These helpers say what a form
// field means, so schemas stay short and behave the same everywhere.

/** Row ids are SQL Server GUIDs, which need not carry the RFC 4122 version bits `z.uuid()` demands. */
export const id = z.guid({ error: "Invalid id" });

/** The `version` a form loaded, for optimistic concurrency. */
export const version = z.preprocess(
  (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : value),
  z.number({ error: "Invalid version" }).int().min(0).max(2_147_483_647),
);

export function requiredString(max = 200) {
  return z
    .string({ error: "Required" })
    .trim()
    .min(1, "Required")
    .max(max, `At most ${max} characters`);
}

/** Blank becomes `undefined`. */
export function optionalString(max = 200) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string({ error: "Enter text" }).trim().max(max, `At most ${max} characters`).optional(),
  );
}

/** An HTML checkbox: present ("on") means true, absent means false. */
export const checkbox = z.preprocess(
  (value) => value === "on" || value === "true" || value === true,
  z.boolean(),
);

/** Repeated keys (a checkbox group, a multi-select) arrive as one string or an array; always an array here. */
export function stringList(max = 200) {
  return z.preprocess(
    (value) => (value === undefined || value === "" ? [] : Array.isArray(value) ? value : [value]),
    z.array(z.string().trim().min(1).max(max)),
  );
}

// ---- Input handling ------------------------------------------------------------------------------

const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const SENSITIVE_FIELD = /pass(word)?|secret|token|otp|pin$/i;

/**
 * FormData to a plain object: a key that appears once becomes its value, a repeated key becomes an
 * array. React's own `$ACTION_*` bookkeeping fields are dropped. Files stay files.
 */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$ACTION_") || UNSAFE_KEYS.has(key)) continue;
    const values = formData.getAll(key);
    result[key] = values.length === 1 ? values[0] : values;
  }
  return result;
}

/** The text the user typed, so a failed submission does not wipe the form. Never passwords or files. */
function echoValues(raw: unknown): Record<string, string | string[]> | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const values: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (SENSITIVE_FIELD.test(key)) continue;
    if (typeof value === "string") values[key] = value;
    else if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
      values[key] = value as string[];
    }
  }
  return Object.keys(values).length > 0 ? values : undefined;
}

function validationState(error: z.ZodError): Extract<AdminActionState, { status: "error" }> {
  const fieldErrors: Record<string, string[]> = {};
  const formErrors: string[] = [];
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".");
    if (key === "") formErrors.push(issue.message);
    else (fieldErrors[key] ??= []).push(issue.message);
  }

  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  return {
    status: "error",
    code: "validation",
    message: hasFieldErrors
      ? ADMIN_ACTION_MESSAGES.validation
      : (formErrors[0] ?? ADMIN_ACTION_MESSAGES.invalid),
    ...(hasFieldErrors ? { fieldErrors } : {}),
  };
}

// ---- Failure mapping -----------------------------------------------------------------------------

function errorState(
  code: AdminActionErrorCode,
  message: string,
  extra: { fieldErrors?: Record<string, string[]>; reference?: string } = {},
): Extract<AdminActionState, { status: "error" }> {
  return { status: "error", code, message, ...extra };
}

function prismaCode(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && /^P\d{4}$/.test(code) ? code : undefined;
}

function toErrorState(
  error: unknown,
  context: { name: string | undefined; userId: string | undefined },
): Extract<AdminActionState, { status: "error" }> {
  if (error instanceof AuthenticationError) {
    return errorState("unauthenticated", ADMIN_ACTION_MESSAGES.unauthenticated);
  }
  if (error instanceof AuthorizationError) {
    return errorState("forbidden", ADMIN_ACTION_MESSAGES.forbidden);
  }
  if (error instanceof AdminActionError) {
    return errorState("rejected", error.message, { fieldErrors: error.fieldErrors });
  }
  if (error instanceof ConflictError) return errorState("conflict", ADMIN_ACTION_MESSAGES.conflict);
  if (toDatabaseError(error) instanceof DatabaseUnavailableError) {
    return errorState("unavailable", ADMIN_ACTION_MESSAGES.unavailable);
  }

  const code = prismaCode(error);
  if (code === "P2002") return errorState("rejected", ADMIN_ACTION_MESSAGES.duplicate);
  if (code === "P2025") return errorState("conflict", ADMIN_ACTION_MESSAGES.missing);

  // Unexpected: log everything for the operator, show the user only a reference that finds the log line.
  const reference = randomBytes(4).toString("hex").toUpperCase();
  logger.error("admin.action_failed", {
    reference,
    action: context.name,
    userId: context.userId,
    error,
  });
  return errorState("internal", `${ADMIN_ACTION_MESSAGES.internal} Reference: ${reference}.`, {
    reference,
  });
}

// ---- The pipeline --------------------------------------------------------------------------------

async function authorize(permissions: readonly Permission[]): Promise<AuthSession> {
  const [first, ...rest] = permissions;
  if (!first) throw new Error("An admin action must require at least one permission");
  const session = await requirePermissionOrThrow(first);
  for (const permission of rest) await requirePermissionOrThrow(permission);
  return session;
}

async function recordAudit(
  audit: AuditEntryInput | AuditEntryInput[] | undefined,
  session: AuthSession,
  ipHash: string,
): Promise<void> {
  if (!audit) return;
  const actor = { id: session.user.id, email: session.user.email };
  // In order: audit rows are a timeline. writeAudit never throws, so a logging failure cannot undo the action.
  for (const entry of Array.isArray(audit) ? audit : [audit]) {
    await writeAudit({ ...entry, actor, ipHash });
  }
}

function createRunner<S extends z.ZodType, R>(config: AdminActionConfig<S, R>) {
  const permissions = Array.isArray(config.permission)
    ? (config.permission as readonly Permission[])
    : [config.permission as Permission];

  return async function run(raw: unknown, echo: boolean): Promise<AdminActionState<R>> {
    let userId: string | undefined;
    // After any failure the form gets its text back, so nobody retypes a long description.
    const failed = (state: Extract<AdminActionState, { status: "error" }>) => {
      const values = echo ? echoValues(raw) : undefined;
      return values ? { ...state, values } : state;
    };

    try {
      // Authorisation first: a caller without permission learns nothing about the schema.
      const session = await authorize(permissions);
      userId = session.user.id;

      const parsed = config.schema.safeParse(raw);
      if (!parsed.success) return failed(validationState(parsed.error));

      const request = await getRequestContext();
      const result = await config.handler({
        input: parsed.data,
        session,
        request: { ipHash: request.ipHash, userAgent: request.userAgent },
      });
      await recordAudit(result.audit, session, request.ipHash);

      return {
        status: "success",
        data: result.data,
        ...(result.message ? { message: result.message } : {}),
      };
    } catch (error) {
      // redirect() and notFound() inside a handler are control flow, not failures.
      unstable_rethrow(error);
      return failed(toErrorState(error, { name: config.name, userId }));
    }
  };
}

/**
 * A Server Action for a `<form action>` (through useActionState / ActionForm). The returned function
 * takes `(previousState, formData)` and always resolves to an AdminActionState; it does not throw.
 */
export function defineAdminAction<S extends z.ZodType, R>(
  config: AdminActionConfig<S, R>,
): AdminFormAction<R> {
  const run = createRunner(config);
  return (_previousState, formData) => run(formDataToObject(formData), true);
}

/**
 * The same pipeline for a call with an object instead of FormData (a button that passes
 * `{ id, version }`, a drag-and-drop reorder). The argument is `unknown` on purpose: the schema, not
 * the caller's types, decides what is acceptable.
 */
export function defineAdminInputAction<S extends z.ZodType, R>(
  config: AdminActionConfig<S, R>,
): (input: unknown) => Promise<AdminActionState<R>> {
  const run = createRunner(config);
  return (input) => run(input, false);
}
