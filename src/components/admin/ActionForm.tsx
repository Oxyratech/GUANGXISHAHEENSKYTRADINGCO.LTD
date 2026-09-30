"use client";

import { CircleCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  createContext,
  useActionState,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  IDLE_ACTION_STATE,
  type AdminActionState,
  type AdminFormAction,
} from "@/server/admin/action-state";
import { adminLoginPath } from "@/server/admin/next-path";
import { AdminLink } from "./AdminLink";
import { RefreshButton } from "./RefreshButton";
import { restoreFormValues } from "./restore-form-values";

interface ActionFormContextValue {
  fieldErrors: Record<string, string[]>;
  pending: boolean;
}

const ActionFormContext = createContext<ActionFormContextValue>({
  fieldErrors: {},
  pending: false,
});

/** For custom controls inside an ActionForm: the server's messages per field name, and the pending flag. */
export function useActionForm(): ActionFormContextValue {
  return useContext(ActionFormContext);
}

export interface ActionFormProps<R> extends Omit<
  ComponentProps<"form">,
  "action" | "children" | "ref"
> {
  /** A Server Action built with defineAdminAction. */
  action: AdminFormAction<R>;
  children: ReactNode;
  /** Toast text when the action returns no message of its own. */
  successMessage?: string;
  onSuccess?: (data: R) => void;
}

/**
 * The form wrapper for admin Server Actions. It wires React 19's useActionState to the shared
 * AdminActionState and gives every form the same behaviour:
 *
 *  - field errors reach their controls (use <ActionField>, which links them with aria-describedby),
 *    and focus moves to the first invalid control, or to the error summary when no field is to blame;
 *  - a failure shows an alert; a lost session offers "Sign in again" (back to this page afterwards),
 *    and an edit conflict offers "Reload";
 *  - what the user typed survives a failed submit;
 *  - success shows a toast and a line of text, and calls `onSuccess`;
 *  - the submit button (<ActionSubmit>) shows progress while the action runs.
 *
 * Give the form a `key` that changes when the record is saved (its version, for example) so its
 * defaults refresh after a successful save.
 */
export function ActionForm<R>({
  action,
  children,
  successMessage = "Saved",
  onSuccess,
  className,
  ...props
}: ActionFormProps<R>) {
  const [state, formAction, pending] = useActionState<AdminActionState<R>, FormData>(
    action,
    IDLE_ACTION_STATE,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { toast } = useToast();

  // Effect Events read the latest props without making the effect re-run when a parent re-renders
  // with a new callback identity (which would toast twice).
  const handleResult = useEffectEvent((result: AdminActionState<R>) => {
    if (result.status === "success") {
      toast({ title: result.message ?? successMessage, variant: "success" });
      onSuccess?.(result.data);
      return;
    }
    if (result.status !== "error") return;

    restoreFormValues(formRef.current, result.values);
    const invalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    (invalid ?? summaryRef.current)?.focus();
  });
  useEffect(() => {
    handleResult(state);
  }, [state]);

  const context = useMemo<ActionFormContextValue>(
    () => ({ fieldErrors: state.status === "error" ? (state.fieldErrors ?? {}) : {}, pending }),
    [state, pending],
  );

  return (
    <ActionFormContext value={context}>
      <form
        ref={formRef}
        action={formAction}
        aria-busy={pending || undefined}
        className={cn("grid gap-5", className)}
        {...props}
      >
        {state.status === "error" && !pending ? (
          <div ref={summaryRef} tabIndex={-1} className="focus-visible:outline-none">
            <Alert variant="danger" title={state.message}>
              {state.code === "unauthenticated" ? (
                <AdminLink href={adminLoginPath(pathname)}>Sign in again</AdminLink>
              ) : null}
              {state.code === "conflict" ? (
                <RefreshButton variant="outline" size="sm" className="mt-1">
                  Reload this page
                </RefreshButton>
              ) : null}
            </Alert>
          </div>
        ) : null}
        {state.status === "success" && !pending ? (
          <p className="flex items-center gap-1.5 text-small text-success-600">
            <CircleCheck aria-hidden className="size-4 shrink-0" />
            {state.message ?? successMessage}
          </p>
        ) : null}
        {children}
      </form>
    </ActionFormContext>
  );
}
