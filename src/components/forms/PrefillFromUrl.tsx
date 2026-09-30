"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { parseInquiryPrefill, type InquiryPrefill } from "@/lib/validation/prefill";

/**
 * Reads the inquiry form's query parameters (a link from a product page carries the product and
 * category) and hands the safe ones to `apply`. It renders nothing. It is its own component so the
 * page can stay static: useSearchParams is only read here, inside a Suspense boundary, and the rest
 * of the form is ordinary server-rendered HTML.
 */
export function PrefillFromUrl({ apply }: { apply: (prefill: InquiryPrefill) => void }) {
  const query = useSearchParams().toString();

  useEffect(() => {
    apply(parseInquiryPrefill(new URLSearchParams(query)));
  }, [query, apply]);

  return null;
}
