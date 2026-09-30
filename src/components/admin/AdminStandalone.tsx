import type { ReactNode } from "react";
import { Logo } from "@/components/brand";

/**
 * A centred page without the shell, for screens that appear where the shell cannot: an error above
 * the console layout, a database outage before the user could be identified, a 404 for a visitor who
 * is not signed in. It supplies the page's <main> landmark.
 */
export function AdminStandalone({ children }: { children: ReactNode }) {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto grid min-h-dvh w-full max-w-xl content-center gap-6 px-4 py-10 focus-visible:outline-none!"
    >
      <Logo size="md" />
      {children}
    </main>
  );
}
