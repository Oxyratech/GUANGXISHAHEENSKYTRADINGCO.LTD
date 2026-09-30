"use client";

import { ActionField } from "@/components/admin/ActionField";
import { ActionForm } from "@/components/admin/ActionForm";
import { ActionSubmit } from "@/components/admin/ActionSubmit";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CATEGORIES } from "@/content/categories";
import { humanizeCode } from "@/server/admin/format";
import { updateProductCore } from "@/server/admin/products/actions";

export function ProductCoreForm({
  id,
  version,
  slug,
  categorySlug,
  origin,
  sortOrder,
  featured,
}: {
  id: string;
  version: number;
  slug: string;
  categorySlug: string;
  origin: string | null;
  sortOrder: number;
  featured: boolean;
}) {
  return (
    <ActionForm
      key={version}
      action={updateProductCore}
      successMessage="Product updated."
      className="grid gap-5 sm:grid-cols-2"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />

      <ActionField
        name="slug"
        label="Slug"
        required
        hint="Lower-case letters, numbers and hyphens. Changing it changes the product's public URL."
      >
        <Input autoComplete="off" maxLength={120} defaultValue={slug} />
      </ActionField>

      <ActionField name="categorySlug" label="Category" required>
        <Select defaultValue={categorySlug}>
          {CATEGORIES.map((category) => (
            <option key={category.slug} value={category.slug}>
              {humanizeCode(category.slug)}
            </option>
          ))}
        </Select>
      </ActionField>

      <ActionField name="origin" label="Origin" hint="Free text, e.g. a province or country.">
        <Input autoComplete="off" maxLength={120} defaultValue={origin ?? ""} />
      </ActionField>

      <ActionField name="sortOrder" label="Sort order" hint="Lower numbers show first within a category.">
        <Input type="number" step={1} defaultValue={sortOrder} />
      </ActionField>

      <ActionField name="featured" label="Featured" layout="inline">
        <Checkbox defaultChecked={featured} />
      </ActionField>

      <div className="sm:col-span-full">
        <ActionSubmit pendingLabel="Saving…">Save</ActionSubmit>
      </div>
    </ActionForm>
  );
}
