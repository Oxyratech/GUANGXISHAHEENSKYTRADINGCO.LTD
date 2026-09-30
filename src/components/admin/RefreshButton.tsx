"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

/** Re-fetches the current page's data from the server without a full reload ("Try again", "Reload"). */
export function RefreshButton({
  children = "Try again",
  variant = "outline",
  size,
  className,
}: Pick<ButtonProps, "children" | "variant" | "size" | "className">) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      loading={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? null : <RefreshCw aria-hidden />}
      {children}
    </Button>
  );
}
