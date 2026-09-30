"use client";

import { ActionField } from "@/components/admin/ActionField";
import { ActionForm } from "@/components/admin/ActionForm";
import { ActionSubmit } from "@/components/admin/ActionSubmit";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { SettingOverview } from "@/server/admin/settings/queries";
import { updateContactSettings } from "@/server/admin/settings/actions";

const SOURCE_LABEL = {
  admin: { label: "Admin setting", tone: "success" as const },
  environment: { label: "Environment variable", tone: "blue" as const },
  none: { label: "Not set", tone: "neutral" as const },
};

/**
 * One field per known SiteSetting, showing which value is in effect and where it comes from.
 * Clearing a field removes the admin override (the environment fallback, if any, applies again);
 * nothing is shown publicly (footer, contact page, structured data) until a value is set here.
 */
export function ContactSettingsForm({ settings }: { settings: readonly SettingOverview[] }) {
  return (
    <ActionForm action={updateContactSettings} successMessage="Settings saved." className="gap-6">
      {settings.map((setting) => {
        const source = SOURCE_LABEL[setting.source];
        return (
          <div
            key={setting.key}
            className="grid gap-2 border-b border-line pb-6 last:border-b-0 last:pb-0"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-label text-ink">{setting.label}</span>
              <Badge variant={source.tone}>{source.label}</Badge>
            </div>
            <p className="text-small text-ink-muted">{setting.description}</p>
            <ActionField
              name={setting.key}
              label={`${setting.label} (admin override)`}
              hint={
                setting.environmentValue
                  ? `Environment fallback: ${setting.environmentValue}${setting.source === "admin" ? " (overridden below)" : ""}`
                  : "No environment fallback is configured for this channel."
              }
            >
              <Input
                defaultValue={setting.adminValue ?? ""}
                maxLength={254}
                placeholder="Not set"
              />
            </ActionField>
            {setting.effectiveValue ? (
              <p className="text-small text-ink-muted">
                Shown publicly as:{" "}
                <span className="font-medium text-ink">{setting.effectiveValue}</span>
              </p>
            ) : (
              <p className="text-small text-warning-700">
                Nothing is shown publicly for this channel yet.
              </p>
            )}
          </div>
        );
      })}
      <div>
        <ActionSubmit pendingLabel="Saving…">Save settings</ActionSubmit>
      </div>
    </ActionForm>
  );
}
