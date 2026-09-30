export type LoginErrorCode =
  | "invalid_input"
  | "invalid_credentials"
  | "locked"
  | "rate_limited"
  | "not_configured"
  | "unavailable"
  | "internal";

/** What the sign-in form shows. It never carries the password, only the email so it can be re-filled. */
export type LoginState =
  | { status: "idle" }
  | {
      status: "error";
      code: LoginErrorCode;
      message: string;
      fieldErrors?: { email?: string; password?: string };
      email?: string;
    };

export const IDLE_LOGIN_STATE: LoginState = { status: "idle" };
