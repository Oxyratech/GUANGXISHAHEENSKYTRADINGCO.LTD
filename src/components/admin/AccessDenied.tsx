import { ErrorState } from "@/components/ui/error-state";
import type { Permission } from "@/server/auth/permissions";
import { AdminButtonLink } from "./AdminLink";

/**
 * The 403 panel: shown by a page whose permission check failed, before it read any data. It says what
 * is missing (the permission key is not a secret) and where to go instead.
 */
export function AccessDenied({ permission }: { permission?: Permission }) {
  return (
    <div className="rounded-lg border border-line bg-white shadow-card">
      <ErrorState
        titleAs="h1"
        title="You do not have access to this page"
        description={
          <>
            Your account does not include the permission needed to view it
            {permission ? (
              <>
                {" "}
                (<code className="font-mono text-small">{permission}</code>)
              </>
            ) : null}
            . If you think this is a mistake, ask an administrator to update your role.
          </>
        }
        action={
          <AdminButtonLink href="/admin" variant="outline">
            Back to the dashboard
          </AdminButtonLink>
        }
      />
    </div>
  );
}
