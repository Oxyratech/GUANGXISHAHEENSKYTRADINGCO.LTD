import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { LogoMark } from "./LogoMark";
import { LOGO_SIZE_CLASSES, type LegalNameVisibility, type LogoSize } from "./sizes";
import type { LogoTone } from "./tones";
import { Wordmark } from "./Wordmark";

export interface LogoProps {
  variant?: "horizontal" | "stacked";
  tone?: LogoTone;
  size?: LogoSize;
  legalName?: LegalNameVisibility;
  /** Render as a link to the locale's home page. */
  asLink?: boolean;
  /**
   * Accessible name, already translated by the caller (for example "Shaheen Sky, home"). Without it
   * the name is the visible wordmark text. On a non-link logo it turns the lockup into one named image.
   */
  label?: string;
  className?: string;
}

/**
 * Brand lockup: mark + wordmark. The lockup is fixed left-to-right in every locale (`dir="ltr"`):
 * the wing mark is directional and must never be mirrored. Where it sits in an RTL page is decided
 * by the parent's layout, as for any other element.
 */
export function Logo({
  variant = "horizontal",
  tone = "onLight",
  size = "md",
  legalName = "always",
  asLink = false,
  label,
  className,
}: LogoProps) {
  const stacked = variant === "stacked";
  const layout = cn(
    "inline-flex",
    stacked ? "flex-col items-center" : "items-center",
    LOGO_SIZE_CLASSES[size].gap,
    className,
  );

  const content = (
    <>
      <LogoMark tone={tone} className={LOGO_SIZE_CLASSES[size].mark} />
      <Wordmark
        tone={tone}
        size={size}
        legalName={legalName}
        align={stacked ? "center" : "start"}
      />
    </>
  );

  if (asLink) {
    return (
      <Link
        href="/"
        dir="ltr"
        aria-label={label}
        className={cn(
          layout,
          // 44px minimum hit area even for the compact size.
          "min-h-11 rounded-xs transition-opacity duration-150 hover:opacity-90",
        )}
      >
        {content}
      </Link>
    );
  }

  return (
    <span dir="ltr" role={label ? "img" : undefined} aria-label={label} className={layout}>
      {content}
    </span>
  );
}
