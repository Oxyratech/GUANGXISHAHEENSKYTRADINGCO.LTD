import { COMPANY } from "@/config/company";
import { cn } from "@/lib/utils";
import { LOGO_SIZE_CLASSES, type LegalNameVisibility, type LogoSize } from "./sizes";
import { LOGO_TONE_CLASSES, type LogoTone } from "./tones";

export interface WordmarkProps {
  tone?: LogoTone;
  size?: LogoSize;
  /** The smaller line with the registered English name. */
  legalName?: LegalNameVisibility;
  align?: "start" | "center";
  className?: string;
}

const NAME_TRACKING = "tracking-[0.16em]";
const LEGAL_TRACKING = "tracking-[0.06em]";

/**
 * "SHAHEEN SKY" with the registered English name beneath. It is a Latin wordmark in every locale:
 * lang/dir are pinned so Chinese and Arabic pages neither swap its font stack nor reorder the
 * punctuation in "CO., LTD.".
 */
export function Wordmark({
  tone = "onLight",
  size = "md",
  legalName = "always",
  align = "start",
  className,
}: WordmarkProps) {
  const tones = LOGO_TONE_CLASSES[tone];
  const sizes = LOGO_SIZE_CLASSES[size];
  const [first = "", ...rest] = COMPANY.brandName.split(" ");
  const centered = align === "center";

  return (
    <span
      lang="en"
      dir="ltr"
      className={cn(
        "flex min-w-0 flex-col font-[family-name:var(--font-plex-sans),system-ui,sans-serif]",
        centered ? "items-center text-center" : "items-start text-start",
        className,
      )}
    >
      <span
        className={cn(
          "leading-none whitespace-nowrap",
          NAME_TRACKING,
          // Letter-spacing trails the last glyph; balance it so the centred lockup is optically centred.
          centered && "ps-[0.16em]",
          sizes.name,
          tones.name,
        )}
      >
        <span className="font-semibold">{first}</span>{" "}
        <span className="font-normal">{rest.join(" ")}</span>
      </span>
      {legalName === "never" ? null : (
        <span
          // `w-full` + `overflow-hidden` lets this line truncate with an ellipsis to whatever
          // width flexbox gives it (see the `min-w-0` chain up through Wordmark and Logo) instead
          // of forcing the header wider than the viewport on narrow phones. The accessible name
          // (an explicit aria-label on the enclosing link) is unaffected by the visual truncation.
          className={cn(
            "mt-1.5 w-full overflow-hidden leading-none font-medium text-ellipsis whitespace-nowrap",
            LEGAL_TRACKING,
            centered && "ps-[0.06em]",
            sizes.legal,
            tones.legal,
            legalName === "sm-up" && "hidden sm:block",
          )}
        >
          {COMPANY.legalNameEn}
        </span>
      )}
    </span>
  );
}
