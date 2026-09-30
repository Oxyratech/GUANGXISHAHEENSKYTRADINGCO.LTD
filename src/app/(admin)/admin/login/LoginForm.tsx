"use client";

import { useActionState, useEffect, useRef } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { loginAction } from "./actions";
import { IDLE_LOGIN_STATE, type LoginState } from "./login-state";

/**
 * Email and password. `disabled` (no database) turns the submit button off; the notice explaining why
 * is rendered by the page. The password field is never re-filled after a failure, and nothing here
 * distinguishes an unknown email from a wrong password: the message comes from the server.
 */
export function LoginForm({ next, disabled }: { next: string; disabled: boolean }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    IDLE_LOGIN_STATE,
  );
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // After a failed attempt, put the cursor where the person retypes: the password, or the first
  // field the server marked when something was missing.
  useEffect(() => {
    if (state.status !== "error") return;
    (state.fieldErrors?.email ? emailRef : passwordRef).current?.focus();
  }, [state]);

  const error = state.status === "error" ? state : null;

  return (
    <form action={formAction} className="grid gap-4" aria-busy={pending || undefined}>
      <input type="hidden" name="next" value={next} />

      {error ? <Alert variant="danger">{error.message}</Alert> : null}

      <FormField label="Email" required error={error?.fieldErrors?.email}>
        <Input
          ref={emailRef}
          name="email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          required
          defaultValue={error?.email}
        />
      </FormField>

      <FormField label="Password" required error={error?.fieldErrors?.password}>
        <Input
          ref={passwordRef}
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </FormField>

      <Button type="submit" loading={pending} disabled={disabled} className="w-full">
        Sign in
      </Button>
    </form>
  );
}
