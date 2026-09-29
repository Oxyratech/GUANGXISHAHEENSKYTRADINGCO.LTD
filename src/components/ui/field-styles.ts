/**
 * Shared look of text-entry controls (Input, Textarea, Select). Invalid state is driven by
 * aria-invalid, so FormField wiring and visual state can never drift apart. Horizontal padding is
 * left to each control (Select needs an asymmetric inline-end for its chevron).
 */
export const fieldControlStyles = [
  "w-full rounded-md border border-line-strong bg-white text-body text-ink",
  "placeholder:text-ink-subtle",
  "transition-colors duration-150 hover:border-navy-600 focus-visible:border-blue-500",
  "disabled:cursor-not-allowed disabled:border-line disabled:bg-surface disabled:text-ink-subtle disabled:hover:border-line",
  "aria-[invalid=true]:border-danger-600 aria-[invalid=true]:hover:border-danger-600",
].join(" ");
