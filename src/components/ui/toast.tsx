"use client";

/*
 * Toasts. Mount <Toaster> once (locale layout), then call useToast().toast({ title, description,
 * variant }) from any client component. The viewport is a labelled live region: danger/warning
 * toasts are announced assertively, info/success politely. F8 focuses the viewport; Esc closes the
 * focused toast; toasts pause while hovered or focused. Never use a toast as the only place an
 * important result is shown: forms keep their inline status.
 *
 *   <Toaster viewportLabel={t("notifications")} closeLabel={t("close")}>{children}</Toaster>
 */
import { CircleAlert, CircleCheck, Info, TriangleAlert, X, type LucideIcon } from "lucide-react";
import { Toast } from "radix-ui";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { useUiDirection } from "./direction";
import "./ui-motion.css";

type ToastVariant = "info" | "success" | "warning" | "danger";

export interface ToastOptions {
  title: ReactNode;
  description?: ReactNode;
  variant?: ToastVariant;
  /** Milliseconds before it closes itself. Default 6000. */
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
  open: boolean;
}

interface ToastApi {
  /** Shows a toast and returns its id. */
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const MAX_VISIBLE = 3;
const EXIT_MS = 250;

const VARIANT_STYLES: Record<
  ToastVariant,
  { icon: LucideIcon; color: string; assertive: boolean }
> = {
  info: { icon: Info, color: "text-blue-600", assertive: false },
  success: { icon: CircleCheck, color: "text-success-600", assertive: false },
  warning: { icon: TriangleAlert, color: "text-warning-700", assertive: true },
  danger: { icon: CircleAlert, color: "text-danger-600", assertive: true },
};

export function Toaster({
  children,
  viewportLabel,
  closeLabel,
}: {
  children: ReactNode;
  /** Translated aria-label of the notifications region. */
  viewportLabel: string;
  closeLabel: string;
}) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const dir = useUiDirection();

  const dismiss = useCallback((id: string) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, open: false } : item)),
    );
    // Keep the closed toast mounted just long enough for its exit animation.
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      setItems((current) => current.filter((item) => item.id !== id));
    }, EXIT_MS);
    timers.current.add(timer);
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    const id = `toast-${(nextId.current += 1)}`;
    setItems((current) => [...current, { ...options, id, open: true }].slice(-MAX_VISIBLE));
    return id;
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const api = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext value={api}>
      <Toast.Provider duration={6000} swipeDirection={dir === "rtl" ? "left" : "right"}>
        {children}
        {items.map((item) => {
          const { icon: VariantIcon, color, assertive } = VARIANT_STYLES[item.variant ?? "info"];
          return (
            <Toast.Root
              key={item.id}
              open={item.open}
              duration={item.duration}
              type={assertive ? "foreground" : "background"}
              onOpenChange={(open) => {
                if (!open) dismiss(item.id);
              }}
              className="ui-toast pointer-events-auto flex items-start gap-3 rounded-lg border border-line bg-white p-4 shadow-raised"
            >
              <VariantIcon aria-hidden className={cn("mt-0.5 size-5 shrink-0", color)} />
              <div className="grid min-w-0 flex-1 gap-0.5">
                <Toast.Title className="text-label text-navy-900">{item.title}</Toast.Title>
                {item.description ? (
                  <Toast.Description className="text-small text-ink-muted">
                    {item.description}
                  </Toast.Description>
                ) : null}
              </div>
              <Toast.Close
                aria-label={closeLabel}
                className="-me-2 -mt-2.5 inline-flex size-11 shrink-0 items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-surface hover:text-navy-900"
              >
                <X aria-hidden className="size-4" />
              </Toast.Close>
            </Toast.Root>
          );
        })}
        <Toast.Viewport
          label={viewportLabel}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] m-0 flex list-none flex-col gap-2 p-4 sm:inset-x-auto sm:end-0 sm:w-[26rem]"
        />
      </Toast.Provider>
    </ToastContext>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside <Toaster>");
  return api;
}
