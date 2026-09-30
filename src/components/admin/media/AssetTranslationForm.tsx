"use client";

import { ActionField } from "@/components/admin/ActionField";
import { ActionForm } from "@/components/admin/ActionForm";
import { ActionSubmit } from "@/components/admin/ActionSubmit";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AdminFormAction } from "@/server/admin/action-state";
import type { MediaTranslationResult } from "@/server/admin/media/actions";

/** Edits one locale's alt text and caption. One of these per locale, each its own small form. */
export function AssetTranslationForm({
  action,
  assetId,
  locale,
  localeLabel,
  initial,
}: {
  action: AdminFormAction<MediaTranslationResult>;
  assetId: string;
  locale: string;
  localeLabel: string;
  initial: { altText: string | null; caption: string | null };
}) {
  return (
    <ActionForm
      // Remounts (and drops any half-typed edit) after a successful save, since the server's saved
      // text becomes the new default the next time this form is opened.
      key={`${initial.altText ?? ""}-${initial.caption ?? ""}`}
      action={action}
      successMessage={`Saved ${localeLabel} text`}
    >
      <input type="hidden" name="id" value={assetId} />
      <input type="hidden" name="locale" value={locale} />
      <ActionField
        name="altText"
        label={`Alt text (${localeLabel})`}
        hint="Describes the image for screen readers and search engines. Leave blank for a document."
      >
        <Input defaultValue={initial.altText ?? ""} maxLength={300} />
      </ActionField>
      <ActionField name="caption" label={`Caption (${localeLabel})`}>
        <Textarea defaultValue={initial.caption ?? ""} maxLength={500} rows={3} />
      </ActionField>
      <div>
        <ActionSubmit size="sm">Save {localeLabel} text</ActionSubmit>
      </div>
    </ActionForm>
  );
}
