import { useId } from "react";

/** A per-instance id that is safe inside `url(#...)`, so repeated graphics never share gradients or patterns. */
export function useSvgId(): string {
  return `g${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}
