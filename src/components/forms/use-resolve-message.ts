"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { resolveMessage } from "@/lib/validation/message-key";

/** Turns a message key from a schema or an action result into text in the visitor's language. */
export function useResolveMessage(): (message: string) => string {
  const t = useTranslations();
  // The key type is erased on purpose: a message key is checked against the catalogue where it is written.
  return useCallback(
    (message) => resolveMessage((key, values) => t(key, values as never), message),
    [t],
  );
}
