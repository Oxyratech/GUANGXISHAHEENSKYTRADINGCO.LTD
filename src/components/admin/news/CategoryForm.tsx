"use client";

import { useRouter } from "next/navigation";
import { ActionField } from "@/components/admin/ActionField";
import { ActionForm } from "@/components/admin/ActionForm";
import { ActionSubmit } from "@/components/admin/ActionSubmit";
import { Input } from "@/components/ui/input";
import { LOCALE_META, LOCALES } from "@/i18n/locales";
import { createNewsCategory, updateNewsCategory } from "@/server/admin/news/categories/actions";
import type { NewsCategoryRow } from "@/server/admin/news/categories/queries";

export function CategoryForm({ category }: { category?: NewsCategoryRow }) {
  const router = useRouter();
  const action = category ? updateNewsCategory : createNewsCategory;

  return (
    <ActionForm
      action={action}
      successMessage={category ? "Category updated." : "Category created."}
      onSuccess={() => {
        if (!category) router.push("/admin/news/categories");
      }}
      className="grid max-w-xl gap-5"
    >
      {category ? <input type="hidden" name="id" value={category.id} /> : null}

      <ActionField name="slug" label="Slug" required hint="Lowercase letters, numbers and hyphens.">
        <Input maxLength={80} defaultValue={category?.slug} />
      </ActionField>

      <ActionField name="sortOrder" label="Sort order" required hint="Lower numbers appear first.">
        <Input type="number" min={0} max={10000} defaultValue={category?.sortOrder ?? 0} />
      </ActionField>

      {LOCALES.map((locale) => (
        <ActionField
          key={locale}
          name={`name_${locale}`}
          label={`Name (${LOCALE_META[locale].nativeName})`}
          required
        >
          <Input maxLength={120} defaultValue={category?.names[locale] ?? ""} />
        </ActionField>
      ))}

      <div>
        <ActionSubmit pendingLabel="Saving…">{category ? "Save category" : "Create category"}</ActionSubmit>
      </div>
    </ActionForm>
  );
}
