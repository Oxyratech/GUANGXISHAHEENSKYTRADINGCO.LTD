"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionField } from "@/components/admin/ActionField";
import { ActionForm } from "@/components/admin/ActionForm";
import { ActionSubmit } from "@/components/admin/ActionSubmit";
import { slugify } from "@/components/admin/products/slugify";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CATEGORIES } from "@/content/categories";
import { humanizeCode } from "@/server/admin/format";
import { createProduct } from "@/server/admin/products/actions";

/**
 * The "New product" form: just enough to create a DRAFT (English name, slug, category, origin, sort
 * order, featured). Everything else — other locales, images, documents, specifications — is added on
 * the editor page the create redirects to.
 */
export function CreateProductForm() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <ActionForm
      action={createProduct}
      successMessage="Product created as a draft."
      onSuccess={(data) => router.push(`/admin/products/${data.id}`)}
      className="grid max-w-xl gap-5"
    >
      <ActionField
        name="name"
        label="English name"
        required
        hint="Shown to buyers on the public site. Other locales are added on the next page."
      >
        <Input
          autoComplete="off"
          maxLength={200}
          onChange={(event) => {
            if (!slugTouched) setSlug(slugify(event.target.value));
          }}
        />
      </ActionField>
      <ActionField
        name="slug"
        label="Slug"
        required
        hint="Lower-case letters, numbers and hyphens, e.g. steel-wire-mesh. Used in the product's URL."
      >
        <Input
          autoComplete="off"
          maxLength={120}
          value={slug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(event.target.value);
          }}
        />
      </ActionField>
      <ActionField name="categorySlug" label="Category" required>
        <Select defaultValue="">
          <option value="" disabled>
            Choose a category…
          </option>
          {CATEGORIES.map((category) => (
            <option key={category.slug} value={category.slug}>
              {humanizeCode(category.slug)}
            </option>
          ))}
        </Select>
      </ActionField>
      <ActionField name="origin" label="Origin" hint="Free text, e.g. a province or country.">
        <Input autoComplete="off" maxLength={120} />
      </ActionField>
      <ActionField name="sortOrder" label="Sort order" hint="Lower numbers show first within a category.">
        <Input type="number" defaultValue={0} step={1} />
      </ActionField>
      <ActionField name="featured" label="Featured" layout="inline">
        <Checkbox />
      </ActionField>
      <div>
        <ActionSubmit pendingLabel="Creating…">Create draft</ActionSubmit>
      </div>
    </ActionForm>
  );
}
