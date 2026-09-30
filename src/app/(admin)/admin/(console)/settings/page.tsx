import type { Metadata } from "next";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { DatabaseUnavailablePanel } from "@/components/admin/DatabaseUnavailablePanel";
import { PageHeader } from "@/components/admin/PageHeader";
import { ContactSettingsForm } from "@/components/admin/settings/ContactSettingsForm";
import { Alert } from "@/components/ui/alert";
import { asDatabaseOutage, requireAdminPage } from "@/server/admin/access";
import { loadSettingsOverview } from "@/server/admin/settings/queries";
import { getEnv } from "@/server/env";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const access = await requireAdminPage("settings:read", { next: "/admin/settings" });
  if (!access.ok) return <AdminAccessFailure access={access} permission="settings:read" />;
  const { session } = access;

  let settings;
  try {
    settings = await loadSettingsOverview();
  } catch (error) {
    const outage = asDatabaseOutage(error);
    if (!outage) throw error;
    return (
      <>
        <PageHeader title="Settings" />
        <DatabaseUnavailablePanel cause={outage.cause} titleAs="h2" />
      </>
    );
  }

  const canWrite = session.permissions.has("settings:write");
  const inquiryNotifyEmail = getEnv().INQUIRY_NOTIFY_EMAIL;

  return (
    <>
      <PageHeader
        title="Settings"
        description="Public contact channels and where each one's value currently comes from."
      />

      <div className="grid gap-6">
        <Alert variant="info" title="Nothing is public until it is set">
          No contact details exist until an admin setting or environment variable supplies one. Once
          a channel has a value, it appears in the site footer, the contact page and structured
          data.
        </Alert>

        <section className="rounded-lg border border-line bg-white p-5 shadow-card">
          {canWrite ? (
            <ContactSettingsForm settings={settings} />
          ) : (
            <div className="grid gap-4">
              {settings.map((setting) => (
                <div
                  key={setting.key}
                  className="border-b border-line pb-4 last:border-b-0 last:pb-0"
                >
                  <p className="text-label text-ink">{setting.label}</p>
                  <p className="text-small text-ink-muted">
                    {setting.effectiveValue ?? "Not set"} (
                    {setting.source === "admin"
                      ? "admin setting"
                      : setting.source === "environment"
                        ? "environment variable"
                        : "not set"}
                    )
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-line bg-white p-5 shadow-card">
          <h2 className="mb-1 text-label text-ink">Inquiry notification email</h2>
          <p className="mb-2 text-small text-ink-muted">
            The inbox that receives new-inquiry notification emails. It is read from the{" "}
            <code className="font-mono text-caption">INQUIRY_NOTIFY_EMAIL</code> environment
            variable only; it has no admin-editable setting yet.
          </p>
          <p className="text-small text-ink">
            {inquiryNotifyEmail ?? <span className="text-ink-subtle">Not set</span>}
          </p>
        </section>
      </div>
    </>
  );
}
