export type LogoSize = "sm" | "md" | "lg";

/** `sm-up` hides the long legal-name line below the `sm` breakpoint (narrow headers). */
export type LegalNameVisibility = "always" | "sm-up" | "never";

/** The legal-name line never drops below 10px: it has to stay legible. */
export const LOGO_SIZE_CLASSES: Record<
  LogoSize,
  { readonly mark: string; readonly name: string; readonly legal: string; readonly gap: string }
> = {
  sm: { mark: "size-9", name: "text-[0.9375rem]", legal: "text-[0.625rem]", gap: "gap-2.5" },
  md: { mark: "size-11", name: "text-[1.1875rem]", legal: "text-[0.625rem]", gap: "gap-3" },
  lg: { mark: "size-16", name: "text-[1.75rem]", legal: "text-[0.75rem]", gap: "gap-4" },
};
