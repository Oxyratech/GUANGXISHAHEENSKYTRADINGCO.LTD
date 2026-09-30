"use client";

import { Button } from "@/components/ui/button";

/** Opens the browser's print dialog. Labelled by the caller; hidden from the printout itself. */
export function PrintButton({ label }: { label: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="print:hidden"
      onClick={() => window.print()}
    >
      {label}
    </Button>
  );
}
