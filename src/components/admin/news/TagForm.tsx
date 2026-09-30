"use client";

import { useRouter } from "next/navigation";
import { ActionField } from "@/components/admin/ActionField";
import { ActionForm } from "@/components/admin/ActionForm";
import { ActionSubmit } from "@/components/admin/ActionSubmit";
import { Input } from "@/components/ui/input";
import { LOCALE_META, LOCALES } from "@/i18n/locales";
import { createNewsTag, updateNewsTag } from "@/server/admin/news/tags/actions";
import type { NewsTagRow } from "@/server/admin/news/tags/queries";

export function TagForm({ tag }: { tag?: NewsTagRow }) {
  const router = useRouter();
  const action = tag ? updateNewsTag : createNewsTag;

  return (
    <ActionForm
      action={action}
      successMessage={tag ? "Tag updated." : "Tag created."}
      onSuccess={() => {
        if (!tag) router.push("/admin/news/tags");
      }}
      className="grid max-w-xl gap-5"
    >
      {tag ? <input type="hidden" name="id" value={tag.id} /> : null}

      <ActionField name="slug" label="Slug" required hint="Lowercase letters, numbers and hyphens.">
        <Input maxLength={80} defaultValue={tag?.slug} />
      </ActionField>

      {LOCALES.map((locale) => (
        <ActionField
          key={locale}
          name={`name_${locale}`}
          label={`Name (${LOCALE_META[locale].nativeName})`}
          required
        >
          <Input maxLength={80} defaultValue={tag?.names[locale] ?? ""} />
        </ActionField>
      ))}

      <div>
        <ActionSubmit pendingLabel="Saving…">{tag ? "Save tag" : "Create tag"}</ActionSubmit>
      </div>
    </ActionForm>
  );
}
