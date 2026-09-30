"use client";

import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";
import {
  get,
  useForm,
  type DefaultValues,
  type FieldError,
  type FieldValues,
  type Path,
  type Resolver,
  type UseFormReturn,
} from "react-hook-form";
import type { Locale } from "@/i18n/locales";
import type { AnalyticsProps } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/track";
import { messageKey, type MessageKey } from "@/lib/validation/message-key";
import type { ActionResult, FormState } from "@/server/inquiries/types";
import { serializeForm } from "./serialize-form";
import { useFormToken } from "./use-form-token";

type FormAction = (state: FormState, formData: FormData) => Promise<ActionResult>;

export interface SubmissionFormConfig<
  TInput extends FieldValues,
  TOutput extends FieldValues,
  TField extends Path<TInput>,
> {
  action: FormAction;
  resolver: Resolver<TInput, unknown, TOutput>;
  defaultValues: DefaultValues<TInput>;
  locale: Locale;
  /** Field names in on-screen order; the error summary lists problems in this order. */
  fieldOrder: readonly TField[];
  startedEvent?: "inquiry_started";
  submittedEvent: "inquiry_submitted" | "contact_submitted";
  /** Non-personal properties for the submitted event. Must be a stable (module-level) function. */
  submittedProps?: (values: TInput) => AnalyticsProps;
}

export interface FieldProblem<TField> {
  name: TField;
  /** A message key, see @/lib/validation/message-key. */
  message: MessageKey;
}

export interface SubmissionForm<
  TInput extends FieldValues,
  TOutput extends FieldValues,
  TField extends Path<TInput>,
> {
  form: UseFormReturn<TInput, unknown, TOutput>;
  /** For <form action>: lets a Server Action receive the post if the client-side handler is bypassed. */
  formAction: (formData: FormData) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
  /** Set once the server has stored the submission; null again after startAnother(). */
  success: { referenceCode: string } | null;
  /** A problem with the submission as a whole (not one field), e.g. the database is unreachable. */
  formError: MessageKey | undefined;
  problems: FieldProblem<TField>[];
  messageFor: (name: TField) => MessageKey | undefined;
  retry: () => void;
  startAnother: () => void;
  /** Call on the first interaction with the form (focus or change). */
  markStarted: () => void;
  honeypotRef: RefObject<HTMLInputElement | null>;
  summaryRef: RefObject<HTMLDivElement | null>;
  successRef: RefObject<HTMLDivElement | null>;
}

/** A dropped connection makes the action throw; the form should say so, not fall to the error page. */
function withNetworkFallback(action: FormAction): FormAction {
  return async (state, formData) => {
    try {
      return await action(state, formData);
    } catch {
      return { ok: false, formError: messageKey("errors.form.network") };
    }
  };
}

/**
 * The behaviour both public forms share: react-hook-form with the shared zod schema, the Server
 * Action through useActionState, the anti-spam token, server-side errors shown on their fields,
 * focus that moves to the error summary or the confirmation, and analytics that carry no personal
 * data. The markup stays in the form components.
 */
export function useSubmissionForm<
  TInput extends FieldValues,
  TOutput extends FieldValues,
  TField extends Path<TInput> = Path<TInput>,
>(config: SubmissionFormConfig<TInput, TOutput, TField>): SubmissionForm<TInput, TOutput, TField> {
  const {
    action,
    resolver,
    defaultValues,
    locale,
    fieldOrder,
    startedEvent,
    submittedEvent,
    submittedProps,
  } = config;

  const safeAction = useMemo(() => withNetworkFallback(action), [action]);
  const [state, formAction, pending] = useActionState<FormState, FormData>(safeAction, null);
  const [dismissed, setDismissed] = useState<FormState>(null);
  // A refused submit can leave the error list unchanged; a render is still needed to focus it.
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  const { token, refresh } = useFormToken();

  const form = useForm<TInput, unknown, TOutput>({
    resolver,
    defaultValues,
    mode: "onTouched",
    reValidateMode: "onChange",
    // The summary takes focus instead of the first invalid field, so the whole list is announced.
    shouldFocusError: false,
  });

  const honeypotRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const focusSummary = useRef(false);
  const started = useRef(false);
  const handled = useRef<FormState>(null);

  const result = state === dismissed ? null : state;
  const success = result?.ok ? { referenceCode: result.referenceCode } : null;
  const formError = result && !result.ok ? result.formError : undefined;

  const { errors } = form.formState;
  const messageFor = useCallback(
    (name: TField): MessageKey | undefined =>
      (get(errors, name) as FieldError | undefined)?.message as MessageKey | undefined,
    [errors],
  );
  const problems = fieldOrder.flatMap((name) => {
    const message = messageFor(name);
    return message ? [{ name, message }] : [];
  });

  // A server answer arrives as new state: celebrate, or show what went wrong and where.
  useEffect(() => {
    if (!state || state === dismissed || handled.current === state) return;
    handled.current = state;
    if (state.ok) {
      trackEvent(submittedEvent, { locale, ...submittedProps?.(form.getValues()) });
      successRef.current?.focus();
      return;
    }
    refresh();
    for (const [name, message] of Object.entries(state.fieldErrors ?? {})) {
      form.setError(name as Path<TInput>, { type: "server", message });
    }
    focusSummary.current = true;
    rerender();
  }, [state, dismissed, form, refresh, locale, submittedEvent, submittedProps]);

  // Runs after every render, but only acts once, when the summary it should focus is on screen.
  useEffect(() => {
    if (focusSummary.current && summaryRef.current) {
      focusSummary.current = false;
      summaryRef.current.focus();
    }
  });

  const submit = useCallback(
    (event?: FormEvent<HTMLFormElement>) =>
      form.handleSubmit(
        (values) => {
          if (pending) return;
          const data = serializeForm(values, {
            locale,
            token,
            honeypot: honeypotRef.current?.value ?? "",
          });
          startTransition(() => formAction(data));
        },
        () => {
          focusSummary.current = true;
          rerender();
        },
      )(event),
    [form, pending, locale, token, formAction],
  );

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      void submit(event);
    },
    [submit],
  );

  const retry = useCallback(() => {
    void submit();
  }, [submit]);

  const startAnother = useCallback(() => {
    setDismissed(state);
    form.reset(defaultValues);
    refresh();
  }, [state, form, defaultValues, refresh]);

  const markStarted = useCallback(() => {
    if (started.current || !startedEvent) return;
    started.current = true;
    trackEvent(startedEvent, { locale });
  }, [startedEvent, locale]);

  return {
    form,
    formAction,
    onSubmit,
    pending,
    success,
    formError,
    problems,
    messageFor,
    retry,
    startAnother,
    markStarted,
    honeypotRef,
    summaryRef,
    successRef,
  };
}
