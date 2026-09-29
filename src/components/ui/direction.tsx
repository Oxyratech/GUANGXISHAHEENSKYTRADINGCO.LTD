"use client";

/*
 * Radix primitives that own arrow-key navigation (Tabs, RadioGroup, Accordion, menus) render
 * `dir="ltr"` on their root unless told otherwise, which would also flip Arabic text inside them.
 * Mount <DirectionProvider dir={getDirection(locale)}> once in the locale layout; every wrapper in
 * components/ui reads it through useUiDirection(). If it is missing, the wrappers fall back to
 * <html dir> after hydration, so the UI is still correct, but server HTML would say "ltr".
 */
import { Direction } from "radix-ui";
import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";

type Dir = "ltr" | "rtl";

const UiDirectionContext = createContext<Dir | undefined>(undefined);

export function DirectionProvider({ dir, children }: { dir: Dir; children: ReactNode }) {
  return (
    <UiDirectionContext value={dir}>
      <Direction.Provider dir={dir}>{children}</Direction.Provider>
    </UiDirectionContext>
  );
}

const subscribeNever = () => () => {};

function readDocumentDirection(): Dir | undefined {
  const dir = document.documentElement.dir;
  return dir === "rtl" || dir === "ltr" ? dir : undefined;
}

/** Text direction for Radix `dir` props. `undefined` only during SSR without a provider. */
export function useUiDirection(): Dir | undefined {
  const fromProvider = useContext(UiDirectionContext);
  const fromDocument = useSyncExternalStore(subscribeNever, readDocumentDirection, () => undefined);
  return fromProvider ?? fromDocument;
}
