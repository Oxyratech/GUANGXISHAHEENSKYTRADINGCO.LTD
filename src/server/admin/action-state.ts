/*
 * The value a Server Action built with defineAdminAction returns to the form that called it. It lives
 * in its own module, free of `server-only`, so client components (ActionForm, ConfirmButton) can
 * import the type and the idle constant without pulling server code into the browser bundle.
 */

export type AdminActionErrorCode =
  /** No valid session: it expired, or the user signed out in another tab. */
  | "unauthenticated"
  | "forbidden"
  | "validation"
  /** The record changed since the form was loaded (optimistic concurrency). */
  | "conflict"
  /** The database could not be reached; nothing was saved. */
  | "unavailable"
  /** The handler refused for a reason the user can act on (AdminActionError). */
  | "rejected"
  | "internal";

export type AdminActionState<R = unknown> =
  | { status: "idle" }
  | { status: "success"; data: R; message?: string }
  | {
      status: "error";
      message: string;
      code?: AdminActionErrorCode;
      /** Messages per field, keyed by the field's `name` (nested paths joined with dots). */
      fieldErrors?: Record<string, string[]>;
      /** The submitted text values (never passwords), so the form can put them back after a failure. */
      values?: Record<string, string | string[]>;
      /** Support reference of an unexpected failure; it matches the server log line. */
      reference?: string;
    };

export const IDLE_ACTION_STATE: AdminActionState<never> = { status: "idle" };

/** The signature useActionState expects from a Server Action built with defineAdminAction. */
export type AdminFormAction<R = unknown> = (
  prevState: AdminActionState<R> | undefined,
  formData: FormData,
) => Promise<AdminActionState<R>>;
