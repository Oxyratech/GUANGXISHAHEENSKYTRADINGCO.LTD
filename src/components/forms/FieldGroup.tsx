import type { ReactNode } from "react";

/**
 * A titled group of related fields: a real fieldset, so assistive technology announces the group.
 * Fields sit in two columns from `sm` and stack on a phone; a field that needs the full width
 * passes className="sm:col-span-2".
 */
export function FieldGroup({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 grid min-w-0 gap-5 border-0 p-0">
      <legend className="mb-1 w-full border-b border-line pb-2 text-label text-navy-900">
        {legend}
      </legend>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}
