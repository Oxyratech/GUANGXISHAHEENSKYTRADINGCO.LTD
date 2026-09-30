import { SearchX } from "lucide-react";
import { AdminButtonLink } from "./AdminLink";
import { AdminStandalone } from "./AdminStandalone";

/** "This page does not exist" for the admin: a bad link, or a record that was deleted. */
export function AdminNotFound({ standalone = false }: { standalone?: boolean }) {
  const panel = (
    <div className="flex flex-col items-center gap-5 rounded-lg border border-line bg-white px-6 py-14 text-center shadow-card">
      <div
        aria-hidden
        className="grid size-12 place-items-center rounded-lg border border-line bg-surface text-navy-700"
      >
        <SearchX className="size-6" />
      </div>
      <div className="grid max-w-md gap-2">
        <h1 className="text-h3 text-navy-900">Page not found</h1>
        <p className="text-body text-ink-muted">
          The page or record you asked for does not exist, or it was removed.
        </p>
      </div>
      <AdminButtonLink href="/admin" variant="outline">
        Back to the dashboard
      </AdminButtonLink>
    </div>
  );
  return standalone ? <AdminStandalone>{panel}</AdminStandalone> : panel;
}
