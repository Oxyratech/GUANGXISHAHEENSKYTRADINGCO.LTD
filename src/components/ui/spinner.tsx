import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Loading indicator. Pass `label` (translated) when it is the only loading signal on screen: it is
 * announced as a status. Without a label it is decorative, e.g. inside a busy button. The rotation
 * is a progress signal, so it stops under prefers-reduced-motion.
 */
export function Spinner({ label, className }: { label?: string; className?: string }) {
  const icon = (
    <LoaderCircle aria-hidden className={cn("size-5 motion-safe:animate-spin", className)} />
  );
  if (!label) return icon;
  return (
    <span role="status" className="inline-flex items-center">
      {icon}
      <span className="sr-only">{label}</span>
    </span>
  );
}
