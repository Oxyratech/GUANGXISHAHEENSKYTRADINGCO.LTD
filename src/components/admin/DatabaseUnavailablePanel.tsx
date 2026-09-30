import { ErrorState } from "@/components/ui/error-state";
import type { DatabaseUnavailableCause } from "@/server/db/errors";
import { RefreshButton } from "./RefreshButton";

const COPY: Record<DatabaseUnavailableCause, { title: string; description: string }> = {
  not_configured: {
    title: "Database not configured",
    description: "This area needs a database connection (DATABASE_URL). See docs/DATABASE.md.",
  },
  connection: {
    title: "The database could not be reached",
    description:
      "This page shows real data only, so it cannot be displayed while the database is unreachable. Nothing was changed. Try again in a moment; if it keeps happening, check that the database server is running and that DATABASE_URL is correct.",
  },
  timeout: {
    title: "The database took too long to respond",
    description:
      "This page shows real data only, so it cannot be displayed until the database answers. Nothing was changed. Try again in a moment.",
  },
};

/**
 * What a page shows when its data cannot be loaded because of the database (an outage, or no
 * configuration at all). It is not a sign-out and not a crash: no redirect, no stack trace, and the
 * reason is stated. Pass the `cause` of the DatabaseUnavailableError.
 */
export function DatabaseUnavailablePanel({
  cause = "connection",
  titleAs = "h1",
}: {
  cause?: DatabaseUnavailableCause;
  titleAs?: "h1" | "h2";
}) {
  const { title, description } = COPY[cause];
  return (
    <div className="rounded-lg border border-line bg-white shadow-card">
      <ErrorState
        titleAs={titleAs}
        title={title}
        description={description}
        action={cause === "not_configured" ? undefined : <RefreshButton />}
      />
    </div>
  );
}
