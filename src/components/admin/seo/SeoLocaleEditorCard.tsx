"use client";

import { ActionField } from "@/components/admin/ActionField";
import { ActionForm } from "@/components/admin/ActionForm";
import { ActionSubmit } from "@/components/admin/ActionSubmit";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { CounterField } from "@/components/admin/seo/CounterField";
import { MediaPickerField } from "@/components/admin/seo/MediaPickerField";
import { Checkbox } from "@/components/ui/checkbox";
import { LOCALE_META, type Locale } from "@/i18n/locales";
import type { SeoScope } from "@/lib/domain/statuses";
import { uploadMediaAsset } from "@/server/admin/media/actions";
import { deleteSeoOverride, saveSeoOverride } from "@/server/admin/seo/actions";
import type { SeoOverrideRow } from "@/server/admin/seo/queries";

const TITLE_RECOMMENDED = 60;
const TITLE_MAX = 120;
const DESCRIPTION_RECOMMENDED = 155;
const DESCRIPTION_MAX = 320;

/**
 * One locale's override editor: title, description, "no index" and an Open Graph image, plus the
 * default that would show if this override were removed. Saving is a per-locale action (the row's
 * own unique key is scope+refKey+locale), so each locale is its own independent form.
 */
export function SeoLocaleEditorCard({
  scope,
  refKey,
  locale,
  row,
  defaultTitle,
  defaultDescription,
  canWrite,
}: {
  scope: SeoScope;
  refKey: string;
  locale: Locale;
  row: SeoOverrideRow | null;
  defaultTitle: string | null;
  defaultDescription: string | null;
  canWrite: boolean;
}) {
  return (
    <section className="grid gap-4 rounded-lg border border-line bg-white p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-label text-navy-900">{LOCALE_META[locale].nativeName}</h3>
        {row ? (
          <ConfirmButton
            action={deleteSeoOverride}
            fields={{ scope, refKey, locale }}
            variant="ghost"
            size="sm"
            label="Remove override"
            title="Remove this override?"
            description="The default title and description will apply again for this locale."
            confirmLabel="Remove override"
          />
        ) : null}
      </div>

      <div className="grid gap-2 rounded-md border border-dashed border-line-strong bg-surface p-3 text-small">
        <p className="text-caption font-medium tracking-wide text-ink-muted uppercase">
          Default (used when there is no override)
        </p>
        <p className="text-ink">{defaultTitle ?? "—"}</p>
        <p className="text-ink-muted">{defaultDescription ?? "—"}</p>
      </div>

      {canWrite ? (
        <ActionForm
          key={row?.updatedAt ?? "new"}
          action={saveSeoOverride}
          successMessage="SEO override saved."
        >
          <input type="hidden" name="scope" value={scope} />
          <input type="hidden" name="refKey" value={refKey} />
          <input type="hidden" name="locale" value={locale} />
          <CounterField
            name="title"
            label="Title override"
            defaultValue={row?.title ?? ""}
            recommended={TITLE_RECOMMENDED}
            max={TITLE_MAX}
          />
          <CounterField
            name="description"
            label="Description override"
            defaultValue={row?.description ?? ""}
            recommended={DESCRIPTION_RECOMMENDED}
            max={DESCRIPTION_MAX}
            multiline
          />
          <MediaPickerField
            name="ogMediaId"
            label="Open Graph image"
            hint="Public image only. Leave empty to use the site's default social image."
            initialId={row?.ogMedia?.id ?? null}
            uploadAction={uploadMediaAsset}
          />
          <ActionField name="noIndex" label="Hide from search engines (noindex)" layout="inline">
            <Checkbox defaultChecked={row?.noIndex ?? false} />
          </ActionField>
          <div>
            <ActionSubmit pendingLabel="Saving…">Save {locale.toUpperCase()}</ActionSubmit>
          </div>
        </ActionForm>
      ) : null}
    </section>
  );
}
