import type { RefObject } from "react";
import { HONEYPOT_FIELD_NAME } from "@/lib/validation/form-fields";

/**
 * A trap for bots that fill in every field. People never see it, cannot reach it with the keyboard
 * and assistive technology skips it (inert + aria-hidden); it sits off-screen rather than in
 * display:none, which many crawlers recognise. Anything typed into it makes the server treat the
 * submission as spam. The label exists only so the input is never unlabeled.
 */
export function HoneypotField({
  label,
  ref,
}: {
  label: string;
  ref: RefObject<HTMLInputElement | null>;
}) {
  return (
    <div aria-hidden inert className="absolute -start-[9999px] top-auto h-px w-px overflow-hidden">
      <label>
        {label}
        <input
          ref={ref}
          type="text"
          name={HONEYPOT_FIELD_NAME}
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </label>
    </div>
  );
}
